const events = [
    {
        name: "ClubFest",
        date: "2026-09-14",
        startTime: "4:30 PM",
        endTime: "7:30 PM",
        location: "McMaster University",
        description: "Come meet the McMaster AIAA team at ClubFest!"
    }
];

let currentDate = new Date(2026, 8, 1); // September 2026

const calendarMonth = document.getElementById("calendar-month");
const calendarDays = document.getElementById("calendar-days");

const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");
const todayButton = document.getElementById("today-button");

const eventModal = document.getElementById("event-modal");
const closeModalButton = document.getElementById("close-modal");


function renderCalendar() {

    calendarDays.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = currentDate.toLocaleString("default", {
        month: "long"
    });

    calendarMonth.textContent = `${monthName} ${year}`;

    // First day of the month
    const firstDay = new Date(year, month, 1).getDay();

    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Number of days in the previous month
    const previousMonthDays = new Date(year, month, 0).getDate();


    // Previous month's days

    for (let i = firstDay - 1; i >= 0; i--) {

        const day = document.createElement("div");

        day.classList.add("calendar-day", "other-month");

        day.innerHTML = `
            <span class="day-number">${previousMonthDays - i}</span>
        `;

        calendarDays.appendChild(day);
    }


    // Current month's days

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {

        const day = document.createElement("div");

        day.classList.add("calendar-day");

        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

        day.innerHTML = `
            <span class="day-number">${dayNumber}</span>
        `;


        // Find events on this date

        const dayEvents = events.filter(
            event => event.date === dateString
        );


        // Display events

        dayEvents.forEach(event => {

            const eventElement = document.createElement("div");

            eventElement.classList.add("calendar-event");

            eventElement.innerHTML = `
                <strong>${event.name}</strong>
                <span>${event.startTime} – ${event.endTime}</span>
            `;


            eventElement.addEventListener("click", () => {

                showEventDetails(event);

            });


            day.appendChild(eventElement);

        });


        calendarDays.appendChild(day);

    }


    // Fill remaining calendar cells

    const totalCells = calendarDays.children.length;

    const remainingCells =
        (7 - (totalCells % 7)) % 7;


    for (let i = 1; i <= remainingCells; i++) {

        const day = document.createElement("div");

        day.classList.add("calendar-day", "other-month");

        day.innerHTML = `
            <span class="day-number">${i}</span>
        `;

        calendarDays.appendChild(day);

    }

}


function showEventDetails(event) {

    const eventName =
        document.getElementById("modal-event-name");

    const eventDate =
        document.getElementById("modal-event-date");

    const eventTime =
        document.getElementById("modal-event-time");

    const eventLocation =
        document.getElementById("modal-event-location");

    const eventDescription =
        document.getElementById("modal-event-description");


    eventName.textContent = event.name;


    const date = new Date(`${event.date}T12:00:00`);

    eventDate.textContent =
        date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });


    eventTime.textContent =
        `${event.startTime} – ${event.endTime}`;


    eventLocation.textContent =
        event.location;


    eventDescription.textContent =
        event.description;


    // Open modal

    eventModal.classList.add("show");

    document.body.classList.add("modal-open");

}


// Close modal with X

closeModalButton.addEventListener("click", () => {

    eventModal.classList.remove("show");

    document.body.classList.remove("modal-open");

});


// Close modal by clicking outside

eventModal.addEventListener("click", (event) => {

    if (event.target === eventModal) {

        eventModal.classList.remove("show");

        document.body.classList.remove("modal-open");

    }

});


// Close modal with Escape

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        eventModal.classList.remove("show");

        document.body.classList.remove("modal-open");

    }

});


// Previous month

prevMonthButton.addEventListener("click", () => {

    currentDate.setMonth(
        currentDate.getMonth() - 1
    );

    renderCalendar();

});


// Next month

nextMonthButton.addEventListener("click", () => {

    currentDate.setMonth(
        currentDate.getMonth() + 1
    );

    renderCalendar();

});


// Today

todayButton.addEventListener("click", () => {

    const today = new Date();

    currentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    renderCalendar();

});


// Initial calendar render

renderCalendar();