
"use strict";

// AL-MAQAM AL-MAHMOUD
const API = "https://api.alquran.cloud/v1";

const homeSections = [
    document.querySelector(".welcome"),
    document.querySelector(".section"),
    document.querySelector(".daily-card")
];

const contentPage = document.getElementById("contentPage");
const pageContent = document.getElementById("pageContent");
const backButton = document.getElementById("backButton");
const themeButton = document.getElementById("themeButton");

let currentPage = "home";
let allSurahs = [];
let currentSurah = null;
let tasbihCount = 0;

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.error("Read storage error:", error);
        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Save storage error:", error);
        return false;
    }
}

const favorites = new Set(
    readStorage("maqamFavorites", []).map(Number)
);

let lastRead = readStorage("maqamLastRead", null);

function saveFavorites() {
    return saveStorage("maqamFavorites", [...favorites]);
}

function saveLastRead(surah, ayahNumber) {
    lastRead = {
        surahNumber: surah.number,
        surahName: surah.name,
        ayahNumber
    };

    if (saveStorage("maqamLastRead", lastRead)) {
        updateContinueButton();
        return true;
    }

    return false;
}

function createTitle(text) {
    const heading = document.createElement("h2");
    heading.className = "page-title";
    heading.textContent = text;
    return heading;
}

function showStatus(text) {
    pageContent.replaceChildren();

    const message = document.createElement("p");
    message.className = "quran-status";
    message.textContent = text;

    pageContent.append(message);
}

async function loadSurahs() {
    if (allSurahs.length === 114) return true;

    try {
        const response = await fetch(`${API}/surah`);

        if (!response.ok) throw new Error("HTTP " + response.status);

        const result = await response.json();

        if (result.code !== 200 || !Array.isArray(result.data)) {
            throw new Error("Invalid surah data");
        }

        allSurahs = result.data;
        return true;
    } catch (error) {
        console.error("Load surahs error:", error);
        return false;
    }
}

// إظهار أو تحديث زر متابعة القراءة
function updateContinueButton() {
    const welcome = document.querySelector(".welcome");
    if (!welcome) return;

    let button = document.getElementById("continueReadingButton");

    if (!lastRead) {
        if (button) button.remove();
        return;
    }

    if (!button) {
        button = document.createElement("button");
        button.id = "continueReadingButton";
        button.className = "continue-button";
        welcome.append(button);
    }

    button.textContent =
        `متابعة القراءة: ${lastRead.surahName} — الآية ${lastRead.ayahNumber}`;

    button.onclick = async () => {
        button.disabled = true;
        button.textContent = "جاري فتح موضع القراءة...";

        const loaded = await loadSurahs();

        if (!loaded) {
            button.disabled = false;
            updateContinueButton();
            alert("تأكد من الإنترنت وحاول مرة أخرى.");
            return;
        }

        const surah = allSurahs.find(
            item => item.number === Number(lastRead.surahNumber)
        );

        if (!surah) {
            button.disabled = false;
            updateContinueButton();
            return;
        }

        currentSurah = surah;
        navigateTo("quran-detail");
    };
}

// التنقل
function navigateTo(page) {
    currentPage = page;

    homeSections.forEach(section => {
        section.hidden = page !== "home";
    });

    contentPage.hidden = page === "home";

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page ||
            (page === "quran-detail" && button.dataset.page === "quran")
        );
    });

    if (page === "home") {
        updateContinueButton();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (page === "quran") {
        renderSurahList();
    } else if (page === "quran-detail") {
        renderSurahDetails();
    } else if (page === "favorites") {
        renderFavorites();
    } else if (page === "adhkar") {
        renderAdhkar();
    } else if (page === "tasbih") {
        renderTasbih();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// قائمة السور
async function renderSurahList() {
    showStatus("جاري تحميل سور القرآن الكريم...");

    const loaded = await loadSurahs();

    if (currentPage !== "quran") return;

    if (!loaded) {
        showStatus("تعذر تحميل السور. تأكد من الإنترنت.");

        const retry = document.createElement("button");
        retry.className = "back-button";
        retry.textContent = "إعادة المحاولة";
        retry.onclick = renderSurahList;
        pageContent.append(retry);
        return;
    }

    pageContent.replaceChildren();
    pageContent.append(createTitle("القرآن الكريم"));

    const description = document.createElement("p");
    description.className = "page-description";
    description.textContent = "114 سورة من القرآن الكريم";

    const search = document.createElement("input");
    search.className = "search-box";
    search.placeholder = "ابحث باسم السورة أو رقمها...";
    search.type = "search";

    const list = document.createElement("div");
    list.className = "surahs-list";

    pageContent.append(description, search, list);

    function display() {
        list.replaceChildren();

        const query = search.value.trim().toLowerCase();

        const filtered = allSurahs.filter(surah =>
            surah.name.includes(query) ||
            surah.englishName.toLowerCase().includes(query) ||
            String(surah.number) === query
        );

        if (!filtered.length) {
            const empty = document.createElement("p");
            empty.className = "quran-status";
            empty.textContent = "لا توجد سورة مطابقة.";
            list.append(empty);
            return;
        }

        filtered.forEach(surah => {
            const card = document.createElement("button");
            card.className = "surah-card";

            const number = document.createElement("span");
            number.className = "surah-number";
            number.textContent = surah.number;

            const info = document.createElement("div");
            info.className = "surah-info";

            const name = document.createElement("h3");
            name.textContent = surah.name;

            const details = document.createElement("p");
            details.textContent =
                `${surah.revelationType === "Meccan" ? "مكية" : "مدنية"} • ${surah.numberOfAyahs} آية`;

            info.append(name, details);
            card.append(number, info);

            card.onclick = () => {
                currentSurah = surah;
                navigateTo("quran-detail");
            };

            list.append(card);
        });
    }

    search.addEventListener("input", display);
    display();
}

// قراءة السورة والتلاوة
async function renderSurahDetails() {
    if (!currentSurah) {
        navigateTo("quran");
        return;
    }

    const surah = currentSurah;
    showStatus(`جاري تحميل سورة ${surah.name}...`);

    try {
        const [textResponse, audioResponse] = await Promise.all([
            fetch(`${API}/surah/${surah.number}`),
            fetch(`${API}/surah/${surah.number}/ar.alafasy`)
                .catch(() => null)
        ]);

        if (!textResponse.ok) throw new Error("Text request failed");

        const textResult = await textResponse.json();

        let audioAyahs = [];

        if (audioResponse && audioResponse.ok) {
            const audioResult = await audioResponse.json();

            if (audioResult.code === 200 && audioResult.data?.ayahs) {
                audioAyahs = audioResult.data.ayahs;
            }
        }

        if (textResult.code !== 200 || !textResult.data?.ayahs) {
            throw new Error("No ayah data");
        }

        if (
            currentPage !== "quran-detail" ||
            currentSurah.number !== surah.number
        ) return;

        const data = textResult.data;
        pageContent.replaceChildren();

        pageContent.append(createTitle(data.name));

        const description = document.createElement("p");
        description.className = "page-description";
        description.textContent =
            `${data.numberOfAyahs} آية • ${data.revelationType === "Meccan" ? "مكية" : "مدنية"}`;

        const favoriteButton = document.createElement("button");
        favoriteButton.className = "back-button";

        function updateFavoriteButton() {
            favoriteButton.textContent = favorites.has(surah.number)
                ? "★ إزالة من المفضلة"
                : "☆ إضافة للمفضلة";
        }

        favoriteButton.onclick = () => {
            if (favorites.has(surah.number)) {
                favorites.delete(surah.number);
            } else {
                favorites.add(surah.number);
            }

            if (!saveFavorites()) {
                alert("تعذر حفظ المفضلة في الجهاز.");
            }

            updateFavoriteButton();
        };

        updateFavoriteButton();
        pageContent.append(description, favoriteButton);

        data.ayahs.forEach((ayah, index) => {
            const card = document.createElement("div");
            card.className = "message-card";
            card.id = `ayah-${ayah.numberInSurah}`;

            const line = document.createElement("p");
            line.className = "ayah-text";

            const verseText = document.createTextNode(ayah.text + " ");

            const number = document.createElement("span");
            number.className = "ayah-number";
            number.textContent = ayah.numberInSurah;

            line.append(verseText, number);
            card.append(line);

            const audioUrl = audioAyahs[index]?.audio;

            if (audioUrl) {
                const audio = document.createElement("audio");
                audio.className = "ayah-audio";
                audio.controls = true;
                audio.preload = "none";
                audio.src = audioUrl;
                audio.setAttribute("aria-label", `تلاوة الآية ${ayah.numberInSurah}`);

                const audioError = document.createElement("p");
                audioError.className = "page-description";
                audioError.hidden = true;
                audioError.textContent = "تعذر تحميل الصوت. تحقق من الإنترنت.";

                audio.addEventListener("error", () => {
                    audioError.hidden = false;
                });

                card.append(audio, audioError);
            }

            const actions = document.createElement("div");
            actions.className = "ayah-actions";

            const saveButton = document.createElement("button");
            saveButton.textContent = "حفظ موضع القراءة";

            saveButton.onclick = () => {
                if (saveLastRead(surah, ayah.numberInSurah)) {
                    saveButton.textContent = "✓ تم حفظ الموضع";
                } else {
                    saveButton.textContent = "تعذر الحفظ";
                }
            };

            actions.append(saveButton);
            card.append(actions);
            pageContent.append(card);
        });

        if (lastRead && Number(lastRead.surahNumber) === surah.number) {
            requestAnimationFrame(() => {
                const target = document.getElementById(
                    `ayah-${lastRead.ayahNumber}`
                );

                if (target) {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            });
        }

    } catch (error) {
        console.error("Surah details error:", error);

        showStatus("تعذر تحميل السورة. تأكد من الإنترنت وحاول مرة أخرى.");

        const retry = document.createElement("button");
        retry.className = "back-button";
        retry.textContent = "إعادة المحاولة";
        retry.onclick = renderSurahDetails;
        pageContent.append(retry);
    }
}

// المفضلة المحفوظة
async function renderFavorites() {
    pageContent.replaceChildren();
    pageContent.append(createTitle("المفضلة"));

    const loaded = await loadSurahs();

    if (currentPage !== "favorites") return;

    if (!loaded) {
        showStatus("تعذر تحميل البيانات. تأكد من الإنترنت.");
        return;
    }

    if (!favorites.size) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent = "لسه مفيش سور في المفضلة.";
        pageContent.append(empty);
        return;
    }

    [...favorites].forEach(number => {
        const surah = allSurahs.find(item => item.number === number);
        if (!surah) return;

        const card = document.createElement("div");
        card.className = "message-card";

        const title = document.createElement("h3");
        title.textContent = surah.name;

        const open = document.createElement("button");
        open.className = "back-button";
        open.textContent = "فتح السورة";
        open.onclick = () => {
            currentSurah = surah;
            navigateTo("quran-detail");
        };

        const remove = document.createElement("button");
        remove.className = "back-button";
        remove.textContent = "إزالة من المفضلة";
        remove.onclick = () => {
            favorites.delete(number);
            saveFavorites();
            renderFavorites();
        };

        card.append(title, open, remove);
        pageContent.append(card);
    });
}

// الأذكار
function renderAdhkar() {
    pageContent.replaceChildren();
    pageContent.append(createTitle("الأذكار"));

    [
        ["الاستغفار", "أستغفر الله وأتوب إليه"],
        ["التسبيح", "سبحان الله وبحمده"],
        ["الحمد", "الحمد لله"],
        ["التوحيد", "لا إله إلا الله"]
    ].forEach(([title, text]) => {
        const card = document.createElement("div");
        card.className = "message-card";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const paragraph = document.createElement("p");
        paragraph.textContent = text;

        card.append(heading, paragraph);
        pageContent.append(card);
    });
}

// المسبحة
function renderTasbih() {
    pageContent.replaceChildren();
    pageContent.append(createTitle("المسبحة الإلكترونية"));

    const counter = document.createElement("div");
    counter.className = "tasbih-count";
    counter.textContent = tasbihCount;

    const controls = document.createElement("div");
    controls.className = "tasbih-controls";

    const add = document.createElement("button");
    add.textContent = "سبّح +";
    add.onclick = () => {
        counter.textContent = ++tasbihCount;
    };

    const reset = document.createElement("button");
    reset.textContent = "تصفير";
    reset.onclick = () => {
        tasbihCount = 0;
        counter.textContent = 0;
    };

    controls.append(add, reset);
    pageContent.append(counter, controls);
}

// ربط الأزرار
document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.page);
    });
});

backButton.addEventListener("click", () => {
    if (currentPage === "quran-detail") {
        navigateTo("quran");
    } else {
        navigateTo("home");
    }
});

themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    themeButton.textContent =
        document.body.classList.contains("light-theme") ? "☾" : "☼";
});

updateContinueButton();
navigateTo("home");

console.log("Al-Maqam Al-Mahmoud loaded.");
