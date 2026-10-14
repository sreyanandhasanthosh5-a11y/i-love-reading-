/* ==========================================
   I LOVE READING - BOOK TRACKER
   ========================================== */

"use strict";

const STORAGE_KEY = "iLoveReadingBooks_v1";

const VALID_STATUSES = ["To Read", "Reading", "Finished"];

const COVER_STYLES = [
    { background: "#f8d8e7", icon: "📕" },
    { background: "#e4dcff", icon: "📘" },
    { background: "#ffe4c9", icon: "📙" },
    { background: "#d9f0e3", icon: "📗" },
    { background: "#dceaff", icon: "📔" },
    { background: "#f5dfd4", icon: "📚" }
];

// Form elements
const bookForm = document.getElementById("book-form");
const titleInput = document.getElementById("book-title");
const authorInput = document.getElementById("book-author");
const statusInput = document.getElementById("book-status");

const titleError = document.getElementById("title-error");
const authorError = document.getElementById("author-error");
const formMessage = document.getElementById("form-message");

// Search and filter elements
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const bookList = document.getElementById("book-list");

// Statistics elements
const totalCount = document.getElementById("total-count");
const todoCount = document.getElementById("todo-count");
const readingCount = document.getElementById("reading-count");
const finishedCount = document.getElementById("finished-count");

let books = loadBooks();

/* ==========================================
   LOCAL STORAGE
   ========================================== */

function loadBooks() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return [];
        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData.filter(function (book) {
            return (
                book &&
                typeof book.id === "string" &&
                typeof book.title === "string" &&
                book.title.trim() !== "" &&
                typeof book.author === "string" &&
                book.author.trim() !== "" &&
                VALID_STATUSES.includes(book.status) &&
                Number.isFinite(book.createdAt)
            );
        });
    } catch (error) {
        console.error("Unable to load saved books:", error);
        return [];
    }
}

function saveBooks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        return true;
    } catch (error) {
        console.error("Unable to save books:", error);

        formMessage.textContent =
            "Unable to save your books. Please check your browser storage.";

        formMessage.style.color = "#c52d54";

        return false;
    }
}

/* ==========================================
   ADD A BOOK
   ========================================== */

bookForm.addEventListener("submit", function (event) {
    event.preventDefault();

    clearErrors();

    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const status = statusInput.value;

    let hasError = false;

    if (!title) {
        titleError.textContent = "Please enter a title";
        titleInput.setAttribute("aria-invalid", "true");
        hasError = true;
    }

    if (!author) {
        authorError.textContent = "Please enter an author";
        authorInput.setAttribute("aria-invalid", "true");
        hasError = true;
    }

    if (!VALID_STATUSES.includes(status)) {
        formMessage.textContent = "Please select a valid reading status.";
        formMessage.style.color = "#c52d54";
        hasError = true;
    }

    if (hasError) {
        return;
    }

    const newBook = {
        id: createBookId(),
        title: title,
        author: author,
        status: status,
        createdAt: Date.now(),
        order: books.reduce(function (maxOrder, book) {
            return Math.max(maxOrder, book.order || 0);
        }, 0) + 1
    };

    books.push(newBook);

    if (!saveBooks()) {
        books.pop();
        return;
    }

    bookForm.reset();

    titleInput.focus();

    searchInput.value = "";
    statusFilter.value = "All";

    formMessage.style.color = "#287b4a";
    formMessage.textContent = '"' + title + '" was added successfully!';

    renderApp();
});

function createBookId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2)
    );
}

function clearErrors() {
    titleError.textContent = "";
    authorError.textContent = "";
    formMessage.textContent = "";

    titleInput.removeAttribute("aria-invalid");
    authorInput.removeAttribute("aria-invalid");
}

/* ==========================================
   SEARCH AND FILTER
   ========================================== */

searchInput.addEventListener("input", renderBooks);
statusFilter.addEventListener("change", renderBooks);

function getVisibleBooks() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    return books
        .filter(function (book) {
            const matchesSearch =
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm);

            const matchesStatus =
                selectedStatus === "All" ||
                book.status === selectedStatus;

            return matchesSearch && matchesStatus;
        })
        .sort(function (a, b) {
            return (
                b.createdAt - a.createdAt ||
                (b.order || 0) - (a.order || 0)
            );
        });
}

/* ==========================================
   DISPLAY BOOKS
   ========================================== */

function renderBooks() {
    bookList.replaceChildren();

    const visibleBooks = getVisibleBooks();

    if (visibleBooks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = books.length === 0 ? "📚" : "🔎";

        const heading = document.createElement("h3");
        heading.textContent =
            books.length === 0
                ? "Your bookshelf is waiting!"
                : "No matching books found";

        const description = document.createElement("p");
        description.textContent =
            books.length === 0
                ? "Add your first book and begin your reading adventure."
                : "Try another title, author, or reading status.";

        emptyState.append(icon, heading, description);
        bookList.appendChild(emptyState);

        return;
    }

    visibleBooks.forEach(function (book, index) {
        bookList.appendChild(createBookCard(book, index));
    });
}

function createBookCard(book, index) {
    const card = document.createElement("article");
    card.className = "book-card";

    const coverStyle = COVER_STYLES[index % COVER_STYLES.length];

    const top = document.createElement("div");
    top.className = "book-card-top";

    const cover = document.createElement("div");
    cover.className = "book-cover";
    cover.style.backgroundColor = coverStyle.background;
    cover.textContent = coverStyle.icon;
    cover.setAttribute("aria-hidden", "true");

    const number = document.createElement("span");
    number.className = "book-number";
    number.textContent = "#" + (index + 1);

    top.append(cover, number);

    const title = document.createElement("h3");
    title.textContent = book.title;

    const author = document.createElement("p");
    author.className = "book-author";
    author.textContent = "by " + book.author;

    const statusRow = document.createElement("div");
    statusRow.className = "book-status-row";

    const badge = document.createElement("span");
    badge.className = "status-badge " + getStatusClass(book.status);
    badge.textContent = getStatusIcon(book.status) + " " + book.status;

    const statusSelect = document.createElement("select");
    statusSelect.className = "book-status-select";
    statusSelect.setAttribute(
        "aria-label",
        "Change reading status for " + book.title
    );

    VALID_STATUSES.forEach(function (status) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        statusSelect.appendChild(option);
    });

    statusSelect.value = book.status;

    statusSelect.addEventListener("change", function () {
        updateBookStatus(book.id, statusSelect.value);
    });

    statusRow.append(badge, statusSelect);

    const actions = document.createElement("div");
    actions.className = "book-actions";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "🗑 Delete";
    deleteButton.setAttribute("aria-label", "Delete " + book.title);

    deleteButton.addEventListener("click", function () {
        deleteBook(book.id);
    });

    actions.appendChild(deleteButton);

    card.append(top, title, author, statusRow, actions);

    return card;
}

function getStatusClass(status) {
    if (status === "Reading") {
        return "status-reading";
    }

    if (status === "Finished") {
        return "status-finished";
    }

    return "status-to-read";
}

function getStatusIcon(status) {
    if (status === "Reading") {
        return "☕";
    }

    if (status === "Finished") {
        return "🎉";
    }

    return "🌷";
}

/* ==========================================
   UPDATE READING STATUS
   ========================================== */

function updateBookStatus(bookId, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
        return;
    }

    const book = books.find(function (item) {
        return item.id === bookId;
    });

    if (!book) {
        return;
    }

    const previousStatus = book.status;

    book.status = newStatus;

    if (!saveBooks()) {
        book.status = previousStatus;
        renderApp();
        return;
    }

    formMessage.style.color = "#287b4a";
    formMessage.textContent =
        '"' + book.title + '" is now marked as ' + newStatus + ".";

    renderApp();
}

/* ==========================================
   DELETE A BOOK
   ========================================== */

function deleteBook(bookId) {
    const index = books.findIndex(function (book) {
        return book.id === bookId;
    });

    if (index === -1) {
        return;
    }

    const deletedBook = books[index];

    const shouldDelete = window.confirm(
        'Are you sure you want to delete "' +
        deletedBook.title +
        '"?'
    );

    if (!shouldDelete) {
        return;
    }

    books.splice(index, 1);

    if (!saveBooks()) {
        books.splice(index, 0, deletedBook);
        return;
    }

    formMessage.style.color = "#287b4a";
    formMessage.textContent = "Book deleted successfully.";

    renderApp();
}

/* ==========================================
   UPDATE READING STATISTICS
   ========================================== */

function renderStatistics() {
    totalCount.textContent = books.length;

    todoCount.textContent = books.filter(function (book) {
        return book.status === "To Read";
    }).length;

    readingCount.textContent = books.filter(function (book) {
        return book.status === "Reading";
    }).length;

    finishedCount.textContent = books.filter(function (book) {
        return book.status === "Finished";
    }).length;
}

/* ==========================================
   RENDER THE APPLICATION
   ========================================== */

function renderApp() {
    renderStatistics();
    renderBooks();
}

/* ==========================================
   INITIALISE
   ========================================== */

renderApp();
