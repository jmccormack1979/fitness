import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Timer, 
  Flame, 
  CheckCircle2, 
  Calendar, 
  Info,
  LineChart,
  Settings,
  Heart,
  Trophy,
  Cloud
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';

// --- Firebase Setup ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fitness-tracker-16';

const App = () => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('plan');
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // 1. Handle Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Sync with Cloud Storage (Firestore)
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'fitness_logs');
    
    // Listen for real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLogs(docSnap.data());
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Helper to update logs both locally and in the cloud
  const updateLogsInCloud = async (newLogs) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'fitness_logs');
      await setDoc(docRef, newLogs);
    } catch (error) {
      console.error("Error saving to cloud:", error);
    }
  };

  const toggleCheck = (id) => {
    const key = `w${currentWeek}_${id}`;
    const newLogs = { ...logs, [key]: !logs[key] };
    setLogs(newLogs);
    updateLogsInCloud(newLogs);
  };

  const updateVal = (id, val) => {
    const key = `w${currentWeek}_val_${id}`;
    const newLogs = { ...logs, [key]: val };
    setLogs(newLogs);
    updateLogsInCloud(newLogs);
  };

  const phases = [
    { name: "Adaptation", weeks: [1, 2, 3, 4], color: "bg-blue-500" },
    { name: "Strength", weeks: [5, 6, 7, 8], color: "bg-purple-500" },
    { name: "Peak", weeks: [9, 10, 11, 12], color: "bg-red-500" },
    { name: "Maintenance", weeks: [13, 14, 15, 16], color: "bg-orange-500" }
  ];

  const currentPhase = phases.find(p => p.weeks.includes(currentWeek));

  const getLongRunDistance = (week) => {
    const distances = [0, 8, 10, 12, 6, 12, 14, 16, 8, 18, 21, 24, 12, 20, 15, 10, 5];
    return distances[week] || 5;
  };

  const personalBests = useMemo(() => {
    const pbs = {
      squat: { val: 0, week: null },
      deadlift: { val: 0, week: null },
      bench: { val: 0, week: null },
      ohp: { val: 0, week: null },
      run5k: { val: Infinity, week: null }
    };

    Object.keys(logs).forEach(key => {
      if (!key.includes('_val_')) return;
      const parts = key.match(/w(\d+)_val_(\w+)_(\d+)/);
      if (!parts) return;

      const week = parseInt(parts[1]);
      const day = parts[2];
      const index = parts[3];
      const numericVal = parseFloat(logs[key]);

      if (isNaN(numericVal)) return;

      if (day === 'Monday' && index === '0' && numericVal > pbs.squat.val) pbs.squat = { val: numericVal, week };
      if (day === 'Monday' && index === '1' && numericVal > pbs.deadlift.val) pbs.deadlift = { val: numericVal, week };
      if (day === 'Thursday' && index === '0' && numericVal > pbs.bench.val) pbs.bench = { val: numericVal, week };
      if (day === 'Thursday' && index === '2' && numericVal > pbs.ohp.val) pbs.ohp = { val: numericVal, week };
      if (day === 'Tuesday' && index === '0' && numericVal < pbs.run5k.val && numericVal > 0) pbs.run5k = { val: numericVal, week };
    });

    return pbs;
  }, [logs]);

  const renderDailyTask = (day, title, icon, color, tasks) => (
    <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className={`p-4 ${color} flex justify-between items-center text-white`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold uppercase tracking-tight text-sm">{day}: {title}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
            <button 
              onClick={() => toggleCheck(`${day}_${i}`)}
              className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                logs[`w${currentWeek}_${day}_${i}`] 
                ? 'bg-green-500 border-green-500' 
                : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {logs[`w${currentWeek}_${day}_${i}`] && <CheckCircle2 size={16} className="text-white" />}
            </button>
            <div className="flex-grow">
              <p className={`text-sm ${logs[`w${currentWeek}_${day}_${i}`] ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {task.name}
              </p>
              {task.subtext && <p className="text-[10px] text-slate-500">{task.subtext}</p>}
            </div>
            {task.input && (
              <input 
                type="text"
                placeholder="kg/min"
                className="w-16 p-1 text-xs border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 text-center"
                value={logs[`w${currentWeek}_val_${day}_${i}`] || ''}
                onChange={(e) => updateVal(`${day}_${i}`, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin mb-4 text-blue-600 inline-block"><Cloud size={32} /></div>
          <p className="text-slate-500 text-sm font-bold animate-pulse">SYNCING CLOUD DATA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 pb-24">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 italic">FITTRACK 16</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${currentPhase?.color}`}></span>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentPhase?.name} Phase</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[70px]">
              <span className="text-[10px] font-black block leading-none text-slate-400">WEEK</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{currentWeek}</span>
            </div>
            <button onClick={() => setCurrentWeek(Math.min(16, currentWeek + 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {activeTab === 'plan' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderDailyTask("Monday", "Lower Body", <Dumbbell size={18}/>, "bg-green-600", [
              { name: "Back Squats (3x8)", subtext: "Input max weight (kg)", input: true },
              { name: "Deadlifts (3x5)", subtext: "Input max weight (kg)", input: true },
              { name: "Walking Lunges (3x10)", subtext: "Stability focus", input: true },
              { name: "Plank & Abs", subtext: "Core finishing" }
            ])}

            {renderDailyTask("Tuesday", "Easy Run", <Heart size={18}/>, "bg-blue-500", [
              { name: "Recovery Run (5-7km)", subtext: "Input time (min) for PB", input: true },
              { name: "Mobility Work", subtext: "Calves & Hips" }
            ])}

            {renderDailyTask("Wednesday", "The Long Run", <Timer size={18}/>, "bg-indigo-600", [
              { name: `Long Run: ${getLongRunDistance(currentWeek)}km`, subtext: "Keep a steady rhythm", input: true },
              { name: "Active Recovery", subtext: "Walk/Stretch" }
            ])}

            {renderDailyTask("Thursday", "Upper Body", <Dumbbell size={18}/>, "bg-red-500", [
              { name: "Bench Press (3x8)", subtext: "Input weight (kg)", input: true },
              { name: "Bent Over Rows (3x10)", subtext: "Input weight (kg)", input: true },
              { name: "Overhead Press (3x10)", subtext: "Input weight (kg)", input: true },
              { name: "Pull-ups (3xMax)", subtext: "Lats", input: true }
            ])}

            {renderDailyTask("Saturday", "HIIT Hybrid", <Flame size={18}/>, "bg-orange-600", [
              { name: "6 Rounds: 5m TM / 5m Exercises", subtext: "Total 60 min session" },
              { name: "Treadmill Speed", subtext: "Target 10-12km/h+", input: true },
              { name: "Bulletproof Circuit", subtext: "KB/Pushups/Copenhagens" }
            ])}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
              <Trophy className="text-yellow-500" /> PERSONAL BESTS
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Squat", val: `${personalBests.squat.val} kg`, week: personalBests.squat.week, color: "text-green-500" },
                { label: "Deadlift", val: `${personalBests.deadlift.val} kg`, week: personalBests.deadlift.week, color: "text-purple-500" },
                { label: "Bench", val: `${personalBests.bench.val} kg`, week: personalBests.bench.week, color: "text-red-500" },
                { label: "OH Press", val: `${personalBests.ohp.val} kg`, week: personalBests.ohp.week, color: "text-blue-500" },
              ].map((pb, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <span className={`text-[10px] font-black uppercase ${pb.color}`}>{pb.label}</span>
                  <div className="text-2xl font-black mt-1">{pb.val}</div>
                  <div className="text-[10px] text-slate-500 italic mt-1">{pb.week ? `Week ${pb.week}` : '--'}</div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-black uppercase text-indigo-500">Fastest Recovery Run (5-7km)</span>
              <div className="text-3xl font-black mt-1">
                {personalBests.run5k.val === Infinity ? '--' : `${personalBests.run5k.val} mins`}
              </div>
              <div className="text-[10px] text-slate-500 italic mt-1">
                {personalBests.run5k.week ? `Achieved in Week ${personalBests.run5k.week}` : 'Log Tuesday run times to see PB'}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-[10px] text-blue-700 dark:text-blue-400">
              <Cloud size={14} />
              <span>Your data is automatically backed up to the cloud as you log.</span>
            </div>
          </div>
        )}

        {activeTab === 'rpe' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2 italic">
                <Info className="text-blue-500" /> RPE GUIDE
              </h2>
              <div className="space-y-5">
                {[
                  { level: "10", title: "Max Effort", desc: "Cannot speak, muscles failing.", color: "bg-red-600" },
                  { level: "8", title: "Hard", desc: "2-3 reps left. Pushing hard.", color: "bg-orange-500" },
                  { level: "7", title: "Comfortably Hard", desc: "Sustainable but challenging.", color: "bg-yellow-500" },
                  { level: "4-6", title: "Moderate", desc: "Full sentences possible.", color: "bg-green-500" },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-xl ${item.color} flex items-center justify-center text-white font-black text-sm shadow-sm`}>{item.level}</div>
                    <div>
                      <h4 className="font-black text-xs leading-none uppercase">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-4 py-3 pb-6">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button onClick={() => setActiveTab('plan')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'plan' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Calendar size={22} /><span className="text-[9px] font-black uppercase tracking-tighter">Plan</span>
          </button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Trophy size={22} /><span className="text-[9px] font-black uppercase tracking-tighter">Stats</span>
          </button>
          <button onClick={() => setActiveTab('rpe')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'rpe' ? 'text-blue-600' : 'text-slate-400'}`}>
            <LineChart size={22} /><span className="text-[9px] font-black uppercase tracking-tighter">RPE</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400" onClick={async () => {
            if(window.confirm("Permanently delete your cloud data?")) {
              setLogs({});
              await updateLogsInCloud({});
            }
          }}>
            <Settings size={22} /><span className="text-[9px] font-black uppercase tracking-tighter">Reset</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;