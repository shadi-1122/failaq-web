
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('pageTitle').textContent = id.charAt(0).toUpperCase() + id.slice(1);
}



const userTableHead = document.querySelector('#userTable thead');
const userTableBody = document.querySelector('#userTable tbody');
let users = [];
let editingCell = null;
let allAchievementKeys = [];

function startEditing(td) {
  if (editingCell || td.textContent.trim() === '') return; // Prevent editing if already editing or cell is blank

  editingCell = td;
  const original = td.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = original;
  td.textContent = '';
  td.classList.add('editing');
  td.appendChild(input);
  input.focus();

  input.addEventListener('blur', () => saveEdit(input, original));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEdit(input, original);
    if (e.key === 'Escape') cancelEdit(original);
  });

  function saveEdit(input, original) {
    const val = input.value.trim();
    const key = td.dataset.key;
    const index = parseInt(td.dataset.index);

    if (key === 'Name' && val === '') {
      alert('Name is required!');
      input.focus();
      return;
    }

    td.textContent = val || original;
    td.classList.remove('editing');
    editingCell = null;

    // Update user object
    if (key.startsWith('achievements.')) {
      const [, program, subkey] = key.split('.');
      users[index].achievements = users[index].achievements || {};
      users[index].achievements[program] = users[index].achievements[program] || {};
      users[index].achievements[program][subkey] = val;
    } else {
      users[index][key] = val || original;
    }

    updateUser(users[index]);
  }

  function cancelEdit(original) {
    td.textContent = original;
    td.classList.remove('editing');
    editingCell = null;
  }
}


async function fetchUsers() {
const res = await fetch('/api/users');
users = await res.json();
collectAllAchievements();
renderTable();
}

function collectAllAchievements() {
const achievementSet = new Set();
users.forEach(user => {
    if (user.achievements) {
    Object.keys(user.achievements).forEach(program => achievementSet.add(program));
    }
});
allAchievementKeys = Array.from(achievementSet);
}

function renderTable() {
  // Create dynamic table headers
  userTableHead.innerHTML = '';
  const headRow = document.createElement('tr');

  const baseHeaders = ['ID', 'Username', 'adno', 'Name', 'Guardian', 'address', 'dateofbirth', 'bloodgroup', 'phone', 'Password', 'Photo'];
  baseHeaders.forEach(title => {
    const th = document.createElement('th');
    th.textContent = title;
    headRow.appendChild(th);
  });

  // Add dynamic achievement headers (Points and Month)
  allAchievementKeys.forEach(program => {
    const thPoints = document.createElement('th');
    thPoints.textContent = `${program} (Points)`;
    headRow.appendChild(thPoints);

    const thMonth = document.createElement('th');
    thMonth.textContent = `${program} (Month)`;
    headRow.appendChild(thMonth);
  });

  const thActions = document.createElement('th');
  thActions.textContent = 'Actions';
  headRow.appendChild(thActions);

  userTableHead.appendChild(headRow);

  // Populate table body
  userTableBody.innerHTML = '';
  users.forEach((user, index) => {
    const tr = document.createElement('tr');

    baseHeaders.forEach(key => {
      const td = document.createElement('td');
      td.textContent = user[key] || '';
      td.dataset.key = key;
      td.dataset.index = index;
      td.classList.add('editable');
      tr.appendChild(td);
    });

    // Add dynamic achievements
    allAchievementKeys.forEach(program => {
      const achv = user.achievements?.[program] || {};
      const points = achv.points ?? '';
      const month = achv.month ?? '';

      const tdPoints = document.createElement('td');
      tdPoints.textContent = points;
      tdPoints.dataset.key = `achievements.${program}.points`;
      tdPoints.dataset.index = index;
      tdPoints.classList.add('editable');
      tr.appendChild(tdPoints);

      const tdMonth = document.createElement('td');
      tdMonth.textContent = month;
      tdMonth.dataset.key = `achievements.${program}.month`;
      tdMonth.dataset.index = index;
      tdMonth.classList.add('editable');
      tr.appendChild(tdMonth);
    });

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteUser(user.id);
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    userTableBody.appendChild(tr);
  });
}


function handleCSVUpload(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const csv = e.target.result;
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    let updatedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const adno = values[0];
      const student = users.find(u => u.adno === adno);

      if (student) {
        student.achievements = student.achievements || {};

        for (let j = 1; j < headers.length; j++) {
          const value = values[j];
          if (!value) continue;

          const header = headers[j];
          const match = header.match(/^(.+?)\s*\((Points|Month)\)$/i);
          if (match) {
            const program = match[1].trim();
            const type = match[2].toLowerCase();

            if (!student.achievements[program]) {
              student.achievements[program] = {};
            }

            student.achievements[program][type] = value;
          }
        }

        updateUser(student);
        updatedCount++;
      }
    }

    alert(`${updatedCount} users' achievements updated correctly from CSV!`);
    fetchUsers(); // Refresh the table
  };
  reader.readAsText(file);
}


async function updateUser(user) {
try {
    const res = await fetch('/api/users/' + user.id, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(user)
    });
    if (!res.ok) {
    const error = await res.json();
    alert('Update failed: ' + error.error);
    fetchUsers();
    }
} catch (e) {
    alert('Update failed');
    fetchUsers();
}
}

async function deleteUser(id) {
if (!confirm('Delete user?')) return;
try {
    const res = await fetch('/api/users/' + id, { method: 'DELETE' });
    if (res.ok) {
    users = users.filter(u => u.id !== id);
    collectAllAchievements();
    renderTable();
    } else {
    alert('Delete failed');
    }
} catch (e) {
    alert('Delete failed');
}
}

document.querySelector('#userTable tbody').addEventListener('click', e => {
if (e.target.classList.contains('editable')) {
    startEditing(e.target);
}
});

document.querySelector('#addUserBtn').addEventListener('click', async () => {
const newUser = {
    Username: 'New username',
    adno: 'New adno',
    Name: 'New User',
    Guardian: 'User guardian',
    address: 'User address',
    dateofbirth: 'User date of birth',
    bloodgroup: 'User blood group',
    phone: 'User phone number',
    Password: 'password',
    Photo: 'Photo/'+'ad no'+'.jpg',
    achievements: {}
};

try {
    const res = await fetch('/api/users', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(newUser)
    });
    if (!res.ok) {
    const err = await res.json();
    alert('Add failed: ' + err.error);
    return;
    }
    const savedUser = await res.json();
    users.push(savedUser);
    collectAllAchievements();
    renderTable();
} catch (e) {
    alert('Add failed');
}
});

fetchUsers();

//Load Toppers

async function loadToppers() {
  try {
    const [toppersRes, usersRes] = await Promise.all([
      fetch('/contents.json'),
      fetch('/users.json')
    ]);

    const { toppers } = await toppersRes.json();
    const users = await usersRes.json();

    const container = document.getElementById('toppersContainer');
    container.className = "toppers";
    container.innerHTML = '';

    toppers.forEach((topper, index) => {
      const user = users.find(u => u.Name === topper.name);
      const adno = user ? user.adno : 'default';
      const photoPath = `/photos/${adno}.jpg`;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${photoPath}" alt="${topper.name}'s photo" onerror="this.src='/photos/default.jpg'">
        <input value="${topper.name}" data-index="${index}" data-field="name" />
        <input value="${topper.percentage}%" data-index="${index}" data-field="percentage" />
      `;
      container.appendChild(card);
    });

    // Save changes when input is blurred
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', async (e) => {
        const index = +e.target.dataset.index;
        const field = e.target.dataset.field;
        let value = e.target.value.trim();

        if (field === 'percentage') {
          value = value.replace('%', '');
        }

        // Update local data
        toppers[index][field] = value;

        // Save to server
        const res = await fetch('/api/contents/toppers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toppers })
        });

        if (!res.ok) {
          alert('Failed to save changes');
        } else if (field === 'percentage') {
          // Reformat input with % sign after saving
          e.target.value = value + '%';
        }
      });
    });

  } catch (err) {
    console.error('Failed to load toppers:', err);
    document.getElementById('toppersContainer').innerHTML = '<p>Error loading toppers</p>';
  }
}

loadToppers();

async function displayTopRanking() {
  const res = await fetch('/api/users');
  const users = await res.json();

  const withPoints = users.map(user => {
    let totalPoints = 0;

    if (user.achievements) {
      for (const key in user.achievements) {
        const entry = user.achievements[key];
        if (entry && entry.points) {
          const val = parseInt(entry.points);
          if (!isNaN(val)) totalPoints += val;
        }
      }
    }

    return { ...user, totalPoints };
  });

  const topTen = withPoints
    .filter(u => u.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const tbody = document.querySelector('#rankingTable tbody');
  tbody.innerHTML = '';

  topTen.forEach((user, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${user.adno}</td>
      <td>${user.Name}</td>
      <td>${user.totalPoints}</td>
    `;
    tbody.appendChild(row);
  });
}


function getCurrentMonthName() {
  return new Date().toLocaleString('default', { month: 'long' });
}

async function displayMonthlyTop10() {
  const res = await fetch('/api/users');
  const users = await res.json();
  const currentMonth = getCurrentMonthName();

  const monthlyPoints = users.map(user => {
    let totalPoints = 0;

    if (user.achievements) {
      for (const key in user.achievements) {
        const entry = user.achievements[key];
        if (entry && entry.month === currentMonth && entry.points) {
          const val = parseInt(entry.points);
          if (!isNaN(val)) totalPoints += val;
        }
      }
    }

    return { ...user, totalPoints };
  });

  const topTen = monthlyPoints
    .filter(u => u.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const tbody = document.querySelector('#monthlyTopperTable tbody');
  tbody.innerHTML = '';

  if (topTen.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No achievements this month</td></tr>`;
  } else {
    topTen.forEach((user, i) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${user.adno}</td>
        <td>${user.Name}</td>
        <td>${user.totalPoints}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

displayMonthlyTop10();
displayTopRanking();

let chart; // global variable for Chart instance

async function renderStudentGraph() {
  if (!adno) return alert("ADNO not defined");

  const res = await fetch('/api/users');
  const users = await res.json();
  const student = users.find(u => u.adno === adno);

  if (!student || !student.achievements) {
    alert("Student not found or no achievements");
    return;
  }

  const monthsOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Aggregate monthly total points
  const monthPoints = {};

  for (const key in student.achievements) {
    const entry = student.achievements[key];
    if (entry && entry.month && entry.points) {
      const month = entry.month;
      const points = parseInt(entry.points);
      if (!isNaN(points)) {
        if (!monthPoints[month]) monthPoints[month] = 0;
        monthPoints[month] += points;
      }
    }
  }

  const sortedMonths = monthsOrder.filter(m => monthPoints[m]);
  const labels = sortedMonths;
  const data = sortedMonths.map(month => monthPoints[month]);

  if (chart) chart.destroy();

  const ctx = document.getElementById('achievementChart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Achievement Points - ${student.Name}`,
        data,
        borderWidth: 4,
        fill: false,
        tension: 0,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        segment: {
          borderColor: ctx => {
            const i = ctx.p0DataIndex;
            const value = data[i];
            if (value < 60) return '#f44336';    // red
            if (value < 80) return '#ff9800';    // orange
            if (value < 110) return '#2196f3';   // blue
            return '#4caf50';                    // green
          }
        },
        pointBackgroundColor: ctx => {
          const value = data[ctx.dataIndex];
          if (value < 60) return '#f44336';
          if (value < 80) return '#ff9800';
          if (value < 110) return '#2196f3';
          return '#4caf50';
        },
        pointBorderColor: ctx => {
          const value = data[ctx.dataIndex];
          if (value < 60) return '#f44336';
          if (value < 80) return '#ff9800';
          if (value < 110) return '#2196f3';
          return '#4caf50';
        }
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 10 }
        }
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
    renderStudentGraph();
  });


// Load Examination

let adno = '1122'; // Replace with dynamic adno if needed

async function loadExams() {
  const res = await fetch('/api/contents');
  const data = await res.json();
  const exams = data.exams || [];

  const container = document.getElementById('examCards');
  container.innerHTML = '';

  exams.forEach(title => {
    createExamCard(title);
  });

  createAddCard(); // Add the "+ Add Exam" card at the end
}

function createExamCard(title = '') {
  const container = document.getElementById('examCards');

  const card = document.createElement('div');
  card.className = 'exam-card';

  const h3 = document.createElement('h3');
  h3.contentEditable = true;
  h3.innerText = title;

  h3.addEventListener('blur', () => saveExams());
  h3.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      h3.blur();
    }
  });

  const openBtn = document.createElement('button');
  openBtn.innerText = 'Open PDF';
  openBtn.style.marginLeft = '10px';

  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = `Examination/${encodeURIComponent(h3.innerText)}/${adno}.pdf`;
    window.open(url, '_blank');
  });

  card.appendChild(h3);
  card.appendChild(openBtn);
  container.appendChild(card);
}

function createAddCard() {
  const container = document.getElementById('examCards');

  const card = document.createElement('div');
  card.className = 'exam-card add-card';
  card.innerHTML = `<span class="material-symbols-rounded">add</span>`;

  card.addEventListener('click', () => {
    // Remove the add card, add new editable card, then re-add the add card
    card.remove();
    createExamCard();
    createAddCard();
    saveExams();
  });

  container.appendChild(card);
}

async function saveExams() {
  const titles = Array.from(document.querySelectorAll('#examCards h3')).map(h => h.innerText.trim());
  await fetch('/api/contents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exams: titles })
  });
}

loadExams();




document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const current = document.getElementById('current').value.trim();
  const newPass = document.getElementById('new').value.trim();
  const confirm = document.getElementById('confirm').value.trim();
  const msg = document.getElementById('passwordMessage');

  if (!current || !newPass || !confirm) {
    msg.textContent = 'All fields are required';
    msg.style.color = 'red';
    return;
  }

  if (newPass !== confirm) {
    msg.textContent = 'New passwords do not match';
    msg.style.color = 'red';
    return;
  }

  try {
    const res = await fetch('/api/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adno: adno, current, new: newPass })
    });

    const result = await res.json();

    if (res.ok) {
      msg.textContent = 'Password updated successfully!';
      msg.style.color = 'green';
      document.getElementById('changePasswordForm').reset();
    } else {
      msg.textContent = result.error || 'Failed to update password';
      msg.style.color = 'red';
    }
  } catch (err) {
    msg.textContent = 'Error connecting to server';
    msg.style.color = 'red';
  }
});

// Handle visibility toggle
document.querySelectorAll('.toggle-visibility').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = document.getElementById(icon.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.textContent = isHidden ? 'visibility' : 'visibility_off';
  });
});


//Gallery

let images = [];
let currentIndex = 0;

async function loadGallery() {
  const res = await fetch('/api/gallery');
  images = await res.json();
  const container = document.getElementById('galleryGrid');
  container.innerHTML = '';

  images.forEach((img, i) => {
    const el = document.createElement('img');
    el.src = `photos/gallery/${img}`;
    el.alt = `Image ${i}`;
    el.addEventListener('click', () => openLightbox(i));
    container.appendChild(el);
  });
}

function openLightbox(index) {
  currentIndex = index;
  const lightbox = document.getElementById('lightbox');
  document.getElementById('lightboxImage').src = `photos/gallery/${images[currentIndex]}`;
  lightbox.style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  document.getElementById('lightboxImage').src = `photos/gallery/${images[currentIndex]}`;
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  document.getElementById('lightboxImage').src = `photos/gallery/${images[currentIndex]}`;
}

document.addEventListener('keydown', (e) => {
  const box = document.getElementById('lightbox');
  if (box.style.display === 'flex') {
    if (e.key === 'ArrowLeft') prevImage();
    else if (e.key === 'ArrowRight') nextImage();
    else if (e.key === 'Escape') closeLightbox();
  }
});

loadGallery();