// ========================================
// KOVA MAIN.JS (CLEAN VERSION)
// No API key prompt, server-based API calls
// ========================================

// ====== FALLBACK PRODUCTS ======
const fallbackProducts = [
    { name: "Streetwear Oversized Hoodie", style: "streetwear", img: "https://via.placeholder.com/200", price: "$45" },
    { name: "Baggy Cargo Pants", style: "streetwear", img: "https://via.placeholder.com/200", price: "$60" },
    { name: "Cozy Knit Sweater", style: "cozy", img: "https://via.placeholder.com/200", price: "$50" },
    { name: "Soft Lounge Joggers", style: "cozy", img: "https://via.placeholder.com/200", price: "$40" },
    { name: "Y2K Baby Tee", style: "y2k", img: "https://via.placeholder.com/200", price: "$25" },
    { name: "Rhinestone Mini Skirt", style: "y2k", img: "https://via.placeholder.com/200", price: "$35" }
];

let shopifyProducts = [];

// ====== LOAD SHOPIFY PRODUCTS (OPTIONAL) ======
async function loadShopifyProducts() {
    try {
        const res = await fetch("/products.json");
        const data = await res.json();

        shopifyProducts = data.products.map((p) => ({
            name: p.title,
            price: p.variants?.[0]?.price || "$?",
            img: p.image?.src || p.images?.[0]?.src || "",
            url: `/products/${p.handle}`,
            style: "general"
        }));

        console.log("Shopify products loaded:", shopifyProducts);
    } catch (err) {
        console.warn("Shopify fetch failed — using fallback products.");
    }
}

// ====== PRODUCT SELECTION ======
function getAvailableProducts() {
    return shopifyProducts.length > 0 ? shopifyProducts : fallbackProducts;
}

function findMatchingProducts(message) {
    const msg = message.toLowerCase();
    const styles = ["streetwear", "cozy", "y2k"];
    const match = styles.find(s => msg.includes(s));
    if (!match) return [];
    return getAvailableProducts().filter(item => item.style === match);
}

// ====== CHAT MEMORY ======
let chatHistory = JSON.parse(sessionStorage.getItem("kova_chat")) || [];
let sessionConversation = [...chatHistory];

// ====== UI SETUP ======
document.addEventListener("DOMContentLoaded", () => {

    loadShopifyProducts();

    const startBtn = document.getElementById("startChat");
    const sendBtn = document.getElementById("sendBtn");
    const inputField = document.getElementById("userInput");
    const messagesDiv = document.getElementById("messages");
    const loading = document.getElementById("loading");
    const chatContainer = document.getElementById("chatContainer");
    const productGrid = document.getElementById("productGrid");

    // ====== START BUTTON ======
    startBtn.addEventListener("click", () => {
        chatContainer.style.display = "block";
        startBtn.style.display = "none";

        setTimeout(() => {
            addMessage("Hey — I’m Kova. If you're shopping for something specific or just exploring ideas, tell me your style, vibe, or upcoming event.", "kova");
        }, 400);
    });

    // ====== ADD MESSAGE TO CHAT ======
    function addMessage(text, sender) {
        const el = document.createElement("div");
        el.classList.add("message", sender);
        el.textContent = text;
        messagesDiv.appendChild(el);

        chatHistory.push({ sender, text });
        sessionConversation.push({ sender, text });
        sessionStorage.setItem("kova_chat", JSON.stringify(chatHistory));

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // ====== DISPLAY PRODUCTS ======
    function displayProducts(products) {
        productGrid.innerHTML = "";

        products.forEach((item) => {
            const card = document.createElement("div");
            card.classList.add("product-item");

            card.innerHTML = `
                <img src="${item.img}">
                <div class="product-info">
                    <p>${item.name}</p>
                    <p>${item.price}</p>
                </div>
            `;

            productGrid.appendChild(card);
        });

        productGrid.style.display = "block";
    }

    // ====== SEND TO SERVER (NEW WAY) ======
    async function sendToKovaServer(messagesArray) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: messagesArray })
            });

            const data = await res.json();
            return data.reply || "Something glitched — say that again.";

        } catch (err) {
            return "Connection issue — try again.";
        }
    }

    // ====== HANDLE BOT REPLY ======
    async function kovaReply(userMessage) {
        loading.style.display = "block";

        const matches = findMatchingProducts(userMessage);
        if (matches.length > 0) {
            displayProducts(matches);
        }

        sessionConversation.push({ sender: "user", text: userMessage });

        // Typing delay (realistic)
        await new Promise(res => setTimeout(res, 600));

        const reply = await sendToKovaServer(sessionConversation);

        loading.style.display = "none";
        addMessage(reply, "kova");

        sessionConversation.push({ sender: "kova", text: reply });
    }

    // ====== SEND BUTTON ======
    sendBtn.addEventListener("click", () => {
        const msg = inputField.value.trim();
        if (!msg) return;
        addMessage(msg, "user");
        inputField.value = "";
        kovaReply(msg);
    });

    // ====== ENTER KEY ======
    inputField.addEventListener("keypress", (event) => {
        if (event.key === "Enter") sendBtn.click();
    });

    // ====== RESTORE OLD CHAT ======
    chatHistory.forEach(msg => addMessage(msg.text, msg.sender));
});
