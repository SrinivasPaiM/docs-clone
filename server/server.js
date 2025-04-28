const mongoose = require("mongoose");
const Document = require("./Document");

// Connect to MongoDB
mongoose.connect("mongodb://localhost/google-docs-clone", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("MongoDB connected successfully");
})
.catch(err => {
  console.error("MongoDB connection error:", err);
});

// Setup Socket.io
const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const defaultValue = "";

// Handle socket connections
io.on("connection", socket => {
  console.log("New client connected");

  socket.on("get-document", async documentId => {
    try {
      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);
      socket.emit("load-document", document.data);

      socket.on("send-changes", delta => {
        socket.broadcast.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async data => {
        await Document.findByIdAndUpdate(documentId, { data });
      });
    } catch (error) {
      console.error("Error handling document:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Function to find or create a document
async function findOrCreateDocument(id) {
  if (id == null) return;

  try {
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue });
  } catch (error) {
    console.error("Error finding or creating document:", error);
    throw error; // Rethrow to handle in the socket listener
  }
}
