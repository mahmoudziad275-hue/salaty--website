const STORAGE_KEY = "ziad_tanafs_premium_v2";

const defaultHabits = [
  "الاستيقاظ الساعة 4:30",
  "الصلاة في وقتها",
  "الأذكار",
  "التعليم الذاتي",
  "مذاكرة الثقافة",
  "مذاكرة الحسابات",
  "الجيم",
  "النوم الساعة 9:00"
];

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDate(dateString, amount) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.habits)) {
      return {
        habits: saved.habits,
        completions: saved.completions || {},
        finishedDays: saved.finishedDays || [],
        goal: saved.goal || 14,
        theme: saved.theme || "dark"
      };
    }
  } catch (error) {
    console.warn("تعذر قراءة البيانات المحفوظة", error);
  }

  return {
    habits: defaultHabits.map((name, i) => ({
      id: i + 1,
      name
    })),
    completions: {},
    finishedDays: [],
    goal: 14,
    theme: "dark"
  };
}

let data = loadData();
let nextId = Math.max(0, ...data.habits.map(h => Number(h.id) || 0)) + 1;

const $ = id => document.getElementById(id);
const today = () => localDate();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isHabitDone(habitId, date = today()) {
  return Boolean(data.completions[date]?.includes(habitId));
}

function toggleHabit(habitId) {
  const date = today();
  if (!data.completions[date]) data.completions[date] = [];

  const list = data.completions[date];
  const index = list.indexOf(habitId);

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(habitId);
  }

  saveData();
  render();
}

function getHabitStreak(habitId) {
  let count = 0;
  let date = today();

  if (!isHabitDone(habitId, date)) {
    date = shiftDate(date, -1);
  }

  while (isHabitDone(habitId, date)) {
    count++;
    date = shiftDate(date, -1);
  }

  return count;
}

function getCurrentStreak() {
  const finished = new Set(data.finishedDays);
  let date = today();

  // إذا لم يُنهَ اليوم بعد، احسب السلسلة حتى أمس.
  if (!finished.has(date)) {
    date = shiftDate(date, -1);
  }

  let count = 0;
  while (finished.has(date)) {
    count++;
    date = shiftDate(date, -1);
  }

  return count;
}

function finishToday() {
  const date = today();

  if (data.finishedDays.includes(date)) {
    return;
  }

  data.finishedDays.push(date);
  data.finishedDays.sort();

  saveData();
  render();

  const ring = $("streakRing");
  ring.classList.add("pulse");
  setTimeout(() => ring.classList.remove("pulse"), 350);
}

function renderStreak() {
  const streak = getCurrentStreak();
  const doneToday = data.finishedDays.includes(today());

  $("streakNumber").textContent = streak;
  $("streakTitle").textContent = doneToday
    ? "أحسنت! أنهيت يومك 🎉"
    : streak > 0
      ? "مستمر في طريق النجاح!"
      : "ابدأ سلسلة نجاحك!";

  $("streakMessage").textContent = doneToday
    ? "تم تسجيل إنجاز اليوم. نكمل بكرة!"
    : "كل يوم تلتزم فيه يضيف يومًا جديدًا لسلسلتك.";

  $("finishDayBtn").disabled = doneToday;
  $("finishDayBtn").classList.toggle("completed", doneToday);
  $("finishDayBtn").textContent = doneToday
    ? "تم إنهاء اليوم ✓"
    : "أنهيت يومي ✓";

  $("todayStatus").textContent = doneToday
    ? "تم تسجيل اليوم بنجاح، ارجع بكرة لزيادة السلسلة"
    : "اضغط مرة واحدة بعد إنهاء يومك";
}

function renderHabits() {
  const list = $("habitsList");
  list.innerHTML = "";

  data.habits.forEach(habit => {
    const done = isHabitDone(habit.id);
    const streak = getHabitStreak(habit.id);

    const item = document.createElement("div");
    item.className = `habit ${done ? "done" : ""}`;

    const check = document.createElement("button");
    check.className = "habit-check";
    check.textContent = "✓";
    check.setAttribute("aria-label", "تسجيل إنجاز العادة");
    check.addEventListener("click", () => toggleHabit(habit.id));

    const info = document.createElement("div");
    info.className = "habit-info";

    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;

    const streakText = document.createElement("div");
    streakText.className = "habit-streak";
    streakText.textContent = `🔥 ${streak} يوم متواصل`;

    info.append(name, streakText);

    const remove = document.createElement("button");
    remove.className = "delete-habit";
    remove.textContent = "×";
    remove.title = "حذف العادة";
    remove.addEventListener("click", () => {
      if (!confirm(`هل تريد حذف عادة "${habit.name}"؟`)) return;

      data.habits = data.habits.filter(h => h.id !== habit.id);

      Object.keys(data.completions).forEach(date => {
        data.completions[date] =
          (data.completions[date] || []).filter(id => id !== habit.id);
      });

      saveData();
      render();
    });

    item.append(check, info, remove);
    list.appendChild(item);
  });
}

function renderStats() {
  const total = data.habits.length;
  const completed = data.habits.filter(h => isHabitDone(h.id)).length;
  const percent = total ? Math.round(completed / total * 100) : 0;

  $("doneCount").textContent = `${completed}/${total}`;
  $("totalCount").textContent = Object.values(data.completions)
    .reduce((sum, arr) => sum + arr.length, 0);
  $("progressPercent").textContent = `${percent}%`;
  $("progressFill").style.width = `${percent}%`;
}

function renderCalendar() {
  const calendar = $("calendar");
  calendar.innerHTML = "";

  for (let i = 34; i >= 0; i--) {
    const date = shiftDate(today(), -i);
    const completed = data.habits.length > 0 &&
      data.habits.every(h => isHabitDone(h.id, date));

    const cell = document.createElement("div");
    cell.className = "day";
    if (completed) cell.classList.add("full");
    if (date === today()) cell.classList.add("today");

    cell.textContent = Number(date.slice(-2));
    cell.title = date;
    calendar.appendChild(cell);
  }
}

function renderGoal() {
  const streak = getCurrentStreak();
  const goal = Number(data.goal) || 14;
  const percent = Math.min(100, Math.round(streak / goal * 100));
  const remaining = Math.max(0, goal - streak);

  $("goalFill").style.width = `${percent}%`;
  $("goalText").textContent = remaining === 0
    ? `مبروك! حققت هدف ${goal} يومًا 🏆`
    : `وصلت إلى ${streak} من ${goal} يومًا. باقي ${remaining} يومًا!`;

  document.querySelectorAll(".goal-btn").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.goal) === goal);
  });
}

function render() {
  renderStreak();
  renderHabits();
  renderStats();
  renderCalendar();
  renderGoal();
}

$("finishDayBtn").addEventListener("click", finishToday);

$("addHabitBtn").addEventListener("click", () => {
  const name = prompt("اكتب اسم العادة الجديدة:");
  if (!name || !name.trim()) return;

  data.habits.push({
    id: nextId++,
    name: name.trim()
  });

  saveData();
  render();
});

document.querySelectorAll(".goal-btn").forEach(button => {
  button.addEventListener("click", () => {
    data.goal = Number(button.dataset.goal);
    saveData();
    renderGoal();
  });
});

$("themeBtn").addEventListener("click", () => {
  data.theme = data.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("light", data.theme === "light");
  saveData();
});

$("backupBtn").addEventListener("click", () => {
  const file = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tanafs-ziad-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("هل أنت متأكد؟ سيتم حذف العادات وسجل الأيام من هذا الجهاز.")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  data = loadData();
  nextId = Math.max(0, ...data.habits.map(h => Number(h.id) || 0)) + 1;
  applyTheme();
  saveData();
  render();
});

function applyTheme() {
  document.body.classList.toggle("light", data.theme === "light");
}

const messages = [
  "النجاح مش خطوة واحدة كبيرة، النجاح خطوات صغيرة بتتكرر كل يوم.",
  "خليك ثابت، حتى الخطوة الصغيرة بتقربك من هدفك.",
  "الانضباط هو إنك تعمل اللي عليك حتى لو مش في مزاجك.",
  "نافس نفسك كل يوم، وخلي إنجازك النهارده أحسن من إمبارح.",
  "ابدأ بما تقدر عليه، واستمر مهما كانت الخطوات بسيطة."
];

$("coachText").textContent =
  messages[new Date().getDate() % messages.length];

applyTheme();
render();