import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Download, Printer, Image as ImageIcon, Loader2, CalendarDays } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

type Student = { id: string; fullName: string; gender: string; roomNumber: string; group?: string; };
type Attendance = { studentId: string; status: string; date: string; };

const MONTHS = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];
const DAY_SHORT = ["Яш", "Дш", "Сш", "Чш", "Пш", "Ҷм", "Шн"]; // 0-Якшанбе, 1-Душанбе...

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  
  // Интихоби давра (моҳ)
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setStudents(list);
    });
    const unsubAtt = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendances(snap.docs.map((d) => d.data() as Attendance));
    });
    return () => { unsubStudents(); unsubAtt(); };
  }, []);

  // Сохтани рӯзҳои моҳ
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Ҳисоб кардани омор барои ҳар як донишҷӯ
  const studentStats = students.map((s) => {
    const att = attendances.filter((a) => a.studentId === s.id && a.date.startsWith(`${year}-${String(month).padStart(2, "0")}`));
    
    let present = 0, absent = 0, sick = 0;
    const dailyStatus: Record<number, string> = {};

    daysArray.forEach((day) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rec = att.find((a) => a.date === dateStr);
      if (rec) {
        if (rec.status === "present") { present++; dailyStatus[day] = "present"; }
        else if (rec.status === "absent") { absent++; dailyStatus[day] = "absent"; }
        else if (rec.status === "sick") { sick++; dailyStatus[day] = "sick"; }
      }
    });

    const total = present + absent + sick;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    return { ...s, present, absent, sick, total, percent, dailyStatus };
  });

  // Ҷамъбаст (Итог)
  const totalStudents = students.length;
  const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
  const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
  const totalSick = studentStats.reduce((sum, s) => sum + s.sick, 0);
  const totalRecords = totalPresent + totalAbsent + totalSick;
  const overallPercent = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  // Функсияҳои сабт
  const downloadImage = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `hisobot_${MONTHS[month - 1]}_${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      alert("Хато ҳангоми сохтани расм.");
    }
    setDownloading(false);
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`hisobot_${MONTHS[month - 1]}_${year}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Хато ҳангоми сохтани PDF.");
    }
    setDownloading(false);
  };

  const printReport = () => {
    if (!reportRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ҳисобот</title>
          <style>
            body { font-family: sans-serif; padding: 10px; background: white; color: black; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; }
            th, td { border: 1px solid #000; padding: 2px; }
            th { background: #e5e7eb; }
            .row-header { text-align: left; }
            .present { color: green; font-weight: bold; }
            .absent { color: red; font-weight: bold; }
            .sick { color: orange; font-weight: bold; }
            .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .info { margin-bottom: 10px; font-size: 12px; }
            .footer { margin-top: 20px; font-size: 12px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Ҳисоботҳо</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={printReport} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20">
            <Printer size={16} /> Чоп
          </button>
          <button onClick={downloadPDF} disabled={downloading} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
          </button>
          <button onClick={downloadImage} disabled={downloading} className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />} Расм
          </button>
        </div>
      </div>

      {/* Интихоби моҳ */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl shadow-sm dark:bg-navy-900">
        <div>
          <label className="mb-1 block text-sm font-medium">Моҳ</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none dark:border-white/15 dark:bg-navy-800 dark:text-white">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Сол</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none dark:border-white/15 dark:bg-navy-800 dark:text-white" />
        </div>
        <div className="flex-1 flex justify-end items-center text-sm text-slate-500">
          <CalendarDays size={16} className="mr-2" />
          {daysArray.length} рӯз
        </div>
      </div>

      {/* Ҷадвали ҳисобот */}
      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div ref={reportRef} className="min-w-[900px] bg-white text-black p-6">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold uppercase">МДТ "Литсяи касбии махсуси маъюбон"</h1>
            <h2 className="text-lg font-semibold text-blue-800">ҲИСОБОТИ ҲОЗИРШАВӢ</h2>
          </div>

          <div className="flex justify-between text-sm mb-4">
            <div>
              <p><b>Гурӯҳ:</b> Ҳама</p>
              <p><b>Давра:</b> {MONTHS[month - 1]} {year}</p>
            </div>
            <div className="text-right">
              <p><b>Санаи таҳия:</b> {new Date().toLocaleDateString('ru-RU')}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-xs text-center">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="border border-slate-400 p-1">№</th>
                <th className="border border-slate-400 p-1 text-left">Ному насаб</th>
                <th className="border border-slate-400 p-1">Ҳуҷра</th>
                <th className="border border-slate-400 p-1 text-emerald-300">Ҳозир</th>
                <th className="border border-slate-400 p-1 text-red-300">Ғоиб</th>
                <th className="border border-slate-400 p-1 text-amber-300">Бемор</th>
                <th className="border border-slate-400 p-1">Ҳамагӣ</th>
                {daysArray.map(d => (
                  <th key={d} className="border border-slate-400 p-1 w-6">{d}</th>
                ))}
              </tr>
              <tr className="bg-blue-100 text-blue-900">
                <th colSpan={7} className="border border-slate-400 p-1 text-right">Рӯзҳои ҳафта</th>
                {daysArray.map(d => {
                  const date = new Date(year, month - 1, d);
                  return <th key={d} className="border border-slate-400 p-0 text-[10px]">{DAY_SHORT[date.getDay()]}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {studentStats.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-400 p-1">{i + 1}</td>
                  <td className="border border-slate-400 p-1 text-left font-medium">{s.fullName}</td>
                  <td className="border border-slate-400 p-1">{s.roomNumber || "—"}</td>
                  <td className="border border-slate-400 p-1 font-bold text-emerald-600">{s.present}</td>
                  <td className="border border-slate-400 p-1 font-bold text-red-600">{s.absent}</td>
                  <td className="border border-slate-400 p-1 font-bold text-amber-600">{s.sick}</td>
                  <td className="border border-slate-400 p-1 font-bold">{s.percent}%</td>
                  {daysArray.map(d => {
                    const st = s.dailyStatus[d];
                    if (st === "present") return <td key={d} className="border border-slate-400 p-1 text-emerald-600 font-bold">✔</td>;
                    if (st === "absent") return <td key={d} className="border border-slate-400 p-1 text-red-600 font-bold">✘</td>;
                    if (st === "sick") return <td key={d} className="border border-slate-400 p-1 text-amber-600 font-bold">-</td>;
                    return <td key={d} className="border border-slate-400 p-1"></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <h3 className="font-bold text-sm mb-2">Омори умумӣ:</h3>
            <ul className="text-sm space-y-1">
              <li><b>Шумораи донишҷӯён:</b> {totalStudents} нафар</li>
              <li><b>Ҳозиршавӣ:</b> {totalPresent} маротиба</li>
              <li><b>Ғоибӣ:</b> {totalAbsent} маротиба</li>
              <li><b>Беморӣ:</b> {totalSick} маротиба</li>
              <li><b>Фоизи умумии ҳозиршавӣ:</b> {overallPercent}%</li>
            </ul>
          </div>

          <div className="mt-10 flex justify-between text-sm">
            <div>
              <p>Мураббӣ: _______________</p>
            </div>
            <div>
              <p>Имзо: _______________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
