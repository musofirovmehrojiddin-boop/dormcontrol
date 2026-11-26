import { auth, db } from "./lib/firebase";

export default function App() {
  return (
    <div className="min-h-screen grid place-items-center bg-sky-50">
      <div className="rounded-2xl bg-white p-8 shadow text-center">
        <h1 className="text-2xl font-bold text-blue-900">DormControl</h1>
        <p className="text-slate-600">Firebase: {auth.app.options.projectId}</p>
        <p className="text-slate-500 text-sm">{db ? "Firestore омода аст" : "Хато"}</p>
      </div>
    </div>
  );
}
