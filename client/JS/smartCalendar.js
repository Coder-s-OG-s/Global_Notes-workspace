import { toLocalDateString } from "./utilities.js";

export function initSmartCalendar(state, callbacks) {
    const toggleBtn = document.querySelector("#calendar-toggle");
    const popup = document.querySelector("#smart-calendar");
    const dateInput = document.querySelector("#date-filter");

    // Update Dynamic Icon & Real-time Date
    const iconMonth = document.querySelector("#cal-icon-month");
    const iconDay = document.querySelector("#cal-icon-day");
    const realTimeDateDisplay = document.querySelector("#real-time-date-display");

    const today = new Date();
    
    if (iconMonth && iconDay) {
        const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        iconMonth.textContent = monthsShort[today.getMonth()];
        iconDay.textContent = String(today.getDate()).padStart(2, '0');
    }

    if (realTimeDateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        realTimeDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    if (!toggleBtn || !popup) return;

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-indexed

    // Toggle Popup
    toggleBtn.addEventListener("click", () => {
        popup.classList.toggle("hidden");
        if (!popup.classList.contains("hidden")) {
            renderCalendar(currentYear, currentMonth, state.notes);
        }
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!popup.contains(e.target) && !toggleBtn.contains(e.target)) {
            popup.classList.add("hidden");
        }
    });

    // Navigation
    document.querySelector("#cal-prev")?.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentYear, currentMonth, state.notes);
    });

    document.querySelector("#cal-next")?.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth, state.notes);
    });

    document.querySelector("#cal-today")?.addEventListener("click", () => {
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();

        // Select today
        const dateStr = toLocalDateString(today);
        dateInput.value = dateStr;
        dateInput.dispatchEvent(new Event("change"));

        renderCalendar(currentYear, currentMonth, state.notes);
    });

    // Export render function so it can be updated externally
    return {
        render: () => {
            // Only render if visible to save resources
            if (!popup.classList.contains("hidden")) {
                renderCalendar(currentYear, currentMonth, state.notes);
            }
        }
    };
}

function renderCalendar(year, month, notes) {
    const grid = document.querySelector("#calendar-grid");
    const label = document.querySelector("#cal-month-year");
    const dateInput = document.querySelector("#date-filter");

    if (!grid || !label) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = "";

    // Day Headers
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    days.forEach(d => {
        const el = document.createElement("div");
        el.className = "calendar-day-header";
        el.textContent = d;
        grid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selectedDate = dateInput.value; // YYYY-MM-DD

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Identify dates with notes
    const datesWithNotes = new Set();
    notes.forEach(note => {
        if (note.createdAt) datesWithNotes.add(note.createdAt.split('T')[0]);
        if (note.updatedAt) datesWithNotes.add(note.updatedAt.split('T')[0]);
    });

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement("div");
        el.className = "calendar-day other-month";
        grid.appendChild(el);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const el = document.createElement("div");
        el.className = "calendar-day";
        el.textContent = day;

        // Format YYYY-MM-DD (local logic)
        const d = new Date(year, month, day);
        // Adjust for timezone offset to ensure correct string generation
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];

        // Check states
        if (dateStr === selectedDate) el.classList.add("selected");
        if (isCurrentMonth && day === today.getDate()) el.classList.add("today");
        if (datesWithNotes.has(dateStr)) {
            const dot = document.createElement("div");
            dot.className = "note-dot";
            el.appendChild(dot);
        }

        el.addEventListener("click", () => {
            dateInput.value = dateStr;
            dateInput.dispatchEvent(new Event("change"));
            // Re-render to update selected state
            renderCalendar(year, month, notes);
        });

        grid.appendChild(el);
    }
}
