// ====== KEY LOADING ======
const kovaApiKey = localStorage.getItem("kova_api");
const shopifyToken = localStorage.getItem("shopify_token");

// Ask for API key if missing
if (!kovaApiKey) {
    const key = prompt("Enter your OpenAI API key to activate Kova:");
    if (key) localStorage.setItem("kova_api", key);
}


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


// ====== FETCH REAL SHOPIFY PRODUCTS ======
async function loadShopifyProducts() {
    try {
        const res = await fetch("/products.json", {
            headers: { "X-Shopify-Storefront-Access-Token": shopifyToken }
        });

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



// ====== UTILITIES ======

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



// ====== CHAT SESSION MEMORY ======
let chatHistory = JSON.parse(sessionStorage.getItem("kova_chat")) || [];
let sessionConversation = [...chatHistory];



// ====== UI HOOKS ======
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

        // Kova introduces herself AFTER the chat opens
        setTimeout(() => {
            addMessage("Hey — I’m Kova. If you're shopping for something specific or just exploring ideas, tell me your style, vibe, or upcoming event.", "kova");
        }, 400);
    });



// ====== MESSAGE HANDLING ======
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



// ====== OPENAI REQUEST ======
async function sendToOpenAI(messagesArray) {

    const systemPrompt = `
You are Kova — an AI fashion stylist. Speak naturally like a real stylist, not a chatbot.

Tone:
Confident, warm, short when clear, longer only when helpful.
No emojis. No robotic phrasing.

Rules:
- Recommend 2–4 items at a time.
- Ask one clarifying question if needed.
- If the user changes direction or asks random questions, adapt smoothly.
- Never mention body type, weight, sizing judgment.
- If user asks, offer boutique-specific fit or size guidance.

Memory:
If user asks: "remember that," respond: "I can save your style for this boutique — want me to?"
Never assume consent.

Ending responses:
Neutral choices like:
"Want more options, a different vibe, or should I pull the last set again?"
`;

    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...messagesArray.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
        }))
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("kova_api")}`
        },
        body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: apiMessages
        })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Something glitched — say that again.";
}



// ====== BOT REPLY ======
async function kovaReply(userMessage) {
    loading.style.display = "block";

    const matches = findMatchingProducts(userMessage);
    if (matches.length > 0) {
        displayProducts(matches);
    }

    sessionConversation.push({ sender: "user", text: userMessage });

    const reply = await sendToOpenAI(sessionConversation);

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



// ====== ENTER KEY TO SEND ======
inputField.addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendBtn.click();
});



// ====== RESTORE PREVIOUS MESSAGES ======
chatHistory.forEach(msg => addMessage(msg.text, msg.sender));

});

