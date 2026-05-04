import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./database/db.js";
dotenv.config();
const port = process.env.PORT;
const app = express();

// import routes
import users from "./routes/authRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

app.use(cors({
    origin: ["http://localhost:3000"],  
    credentials: true,                
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
}));

// middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// connect to database
connectDB();


// api endpoints
app.use("/api/users", users);
app.use("/api/upload", uploadRoutes);
app.use("/api/banners", bannerRoutes);


app.get("/", (req, res) => {
    res.send("varsity server running rapidly")
})

app.listen(port, () => {
    console.log(`varsity server running on port http://localhost:${port}`);
})