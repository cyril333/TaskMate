// ---------- STATE ----------
let tasks = JSON.parse(localStorage.getItem("tm_tasks")) || [];
let events = JSON.parse(localStorage.getItem("tm_events")) || [];

function save() {
  localStorage.setItem("tm_tasks", JSON.stringify(tasks));
  localStorage.setItem("tm_events", JSON.stringify(events));
}

// ---------- PROFILE DROPDOWN (static) ----------
const profileWrap = document.getElementById("profileWrap");
profileWrap.addEventListener("click", e => {
  e.stopPropagation();
  profileWrap.classList.toggle("open");
});
document.addEventListener("click", () => profileWrap.classList.remove("open"));

// ---------- ROUTING ----------
const pages = document.querySelectorAll(".page");
const navBtns = document.querySelectorAll(".nav-btn");

function navigate() {
  const hash = window.location.hash.replace("#", "") || "home";
  pages.forEach(p => p.classList.toggle("active-page", p.id === hash));
  navBtns.forEach(b => b.classList.toggle("active", b.dataset.page === hash));
  renderAll();
}
window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", navigate);

// ---------- helper: two-step confirm delete ----------
function wireDelete(btn, onConfirm) {
  let timer = null;
  btn.addEventListener("click", () => {
    if (btn.classList.contains("confirming")) {
      clearTimeout(timer);
      onConfirm();
    } else {
      btn.classList.add("confirming");
      btn.textContent = "SURE?";
      timer = setTimeout(() => {
        btn.classList.remove("confirming");
        btn.textContent = "✕";
      }, 2500);
    }
  });
}

// ---------- TASKS ----------
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");

[searchInput, statusFilter, categoryFilter].forEach(el =>
  el.addEventListener("input", renderTasks)
);

taskForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("taskInput").value.trim();
  const date = document.getElementById("taskDate").value;
  const priority = document.getElementById("taskPriority").value;
  const category = document.getElementById("taskCategory").value;
  if (!title) return;
  tasks.push({ id: Date.now(), title, date, priority, category, done: false });
  taskForm.reset();
  save();
  renderAll();
});

function renderTasks() {
  const search = searchInput.value.toLowerCase();
  const status = statusFilter.value;
  const category = categoryFilter.value;

  const filtered = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search);
    const matchesStatus = status === "All" || (status === "Done") === t.done;
    const matchesCategory = category === "All" || t.category === category;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  taskList.innerHTML = "";
  document.getElementById("taskEmpty").classList.toggle("show", filtered.length === 0);

  filtered.forEach(t => {
    const li = document.createElement("li");
    if (t.done) li.classList.add("done");
    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${t.done ? "checked" : ""}>
        <div>
          <div class="task-title" data-id="${t.id}">${t.title}</div>
          <div class="task-meta">
            <span class="priority-tag priority-${t.priority}">${t.priority}</span>
            <span class="category-tag">${t.category}</span>
            ${t.date ? `<span>Due: ${t.date}</span>` : ""}
            ${t.done ? `<span class="stamp">Approved</span>` : ""}
          </div>
        </div>
      </div>
      <div class="item-right"><button class="delete-btn">✕</button></div>
    `;
    li.querySelector("input").addEventListener("change", e => {
      t.done = e.target.checked;
      save();
      renderAll();
    });
    wireDelete(li.querySelector(".delete-btn"), () => {
      tasks = tasks.filter(x => x.id !== t.id);
      save();
      renderAll();
    });
    const titleEl = li.querySelector(".task-title");
    titleEl.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = t.title;
      input.className = "task-title-input";
      titleEl.replaceWith(input);
      input.focus();
      const commit = () => {
        t.title = input.value.trim() || t.title;
        save();
        renderAll();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") input.blur(); });
    });
    taskList.appendChild(li);
  });
}

// ---------- SCHEDULE ----------
const scheduleForm = document.getElementById("scheduleForm");
const scheduleList = document.getElementById("scheduleList");

scheduleForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("scheduleInput").value.trim();
  const date = document.getElementById("scheduleDate").value;
  if (!title || !date) return;
  events.push({ id: Date.now(), title, date });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  scheduleForm.reset();
  save();
  renderAll();
});

function renderSchedule() {
  scheduleList.innerHTML = "";
  document.getElementById("scheduleEmpty").classList.toggle("show", events.length === 0);
  events.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-left">
        <div>
          <div class="task-title" data-id="${ev.id}">${ev.title}</div>
          <div class="task-meta"><span>${ev.date}</span></div>
        </div>
      </div>
      <div class="item-right"><button class="delete-btn">✕</button></div>
    `;
    wireDelete(li.querySelector(".delete-btn"), () => {
      events = events.filter(x => x.id !== ev.id);
      save();
      renderAll();
    });
    const titleEl = li.querySelector(".task-title");
    titleEl.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = ev.title;
      input.className = "task-title-input";
      titleEl.replaceWith(input);
      input.focus();
      const commit = () => {
        ev.title = input.value.trim() || ev.title;
        save();
        renderAll();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") input.blur(); });
    });
    scheduleList.appendChild(li);
  });
}

// ---------- PROGRESS ----------
function renderProgress() {
  const progressList = document.getElementById("progressList");
  const done = tasks.filter(t => t.done);
  progressList.innerHTML = "";
  document.getElementById("progressEmpty").classList.toggle("show", done.length === 0);
  done.forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="item-left"><div class="task-title">${t.title}</div></div><div class="item-right"><span class="stamp">Approved</span></div>`;
    progressList.appendChild(li);
  });
  const percent = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressPercent").textContent = percent + "% complete";
}

// ---------- HOME ----------
function renderHome() {
  document.getElementById("homeTotal").textContent = tasks.length;
  document.getElementById("homeDone").textContent = tasks.filter(t => t.done).length;
  document.getElementById("homePending").textContent = tasks.filter(t => !t.done).length;
  document.getElementById("homeEvents").textContent = events.length;
}

function renderAll() {
  renderTasks();
  renderSchedule();
  renderProgress();
  renderHome();
}