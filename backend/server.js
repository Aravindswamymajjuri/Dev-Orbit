const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('./models/chat');
const pdfRoutes = require('./routes/certificates');
const UserRoutes = require('./routes/roles');
const csvRoutes = require('./routes/studentcsv');
const EventRoutes = require('./routes/eventRoutes');
const Teams = require('./routes/teams');
const Contact = require('./routes/contactus');
const Profile = require('./routes/profile');
const notificationRoutes = require('./routes/notification');
const Project = require('./routes/projects');
const teamdata = require('./routes/teamformation');
const teammentor = require('./routes/mentor-assign');
const itemRoutes = require('./routes/item');
const notesRoutes = require('./routes/notes');
const videoRoutes = require('./routes/video');
const examsRoute = require("./routes/examsRoute");
const resportsRoute = require("./routes/reportsRoute");
const chatroutes = require('./routes/chat');
const taskRoutes = require('./routes/taskRoutes');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.BASE_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization"]
  }
});

app.use(express.json());
app.use(cors());

app.set('io', io);

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected to PN database...');
});

const connectedUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication token missing'));
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    connectedUsers.set(socket.userId, socket.id);

    socket.join(socket.userId);

    socket.on('sendMessage', async (data) => {
        try {
            const chat = await Chat.findById(data.chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }

            const capitalizedRole = socket.userRole.charAt(0).toUpperCase() + socket.userRole.slice(1).toLowerCase();

            const newMessage = {
                sender: socket.userId,
                senderModel: capitalizedRole,
                content: data.message.content,
                timestamp: new Date()
            };
            console.log('New message:', newMessage);

            chat.messages.push(newMessage);
            chat.lastMessage = new Date();
            await chat.save();
            // console.log('Last message in chat:', chat.messages[chat.messages.length - 1]);

            chat.participants.forEach(participant => {
                const participantId = participant.user.toString();
                console.log(`Emitting message to participant: ${participantId}`);
                io.to(participantId).emit('newMessage', {
                    chatId: chat._id,
                    message: newMessage
                });
            });
        } catch (error) {
            console.error('Error handling message:', error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        connectedUsers.delete(socket.userId);
    });
});

app.use('/pdf', pdfRoutes);
app.use('/roles', UserRoutes);
app.use('/csv', csvRoutes);
app.use('/api', EventRoutes);
app.use('/teams', Teams);
app.use('/teamformation', teamdata);
app.use("/mentor", teammentor);
app.use('/contact', Contact);
app.use('/profile', Profile);
app.use('/notifications', notificationRoutes);
app.use('/projects', Project);
app.use('/items', itemRoutes);
app.use('/notes', notesRoutes);
app.use('/videos', videoRoutes);
app.use("/api/exams", examsRoute);
app.use("/api/reports", resportsRoute);
app.use('/chat', chatroutes);
app.use('/api', taskRoutes);

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});