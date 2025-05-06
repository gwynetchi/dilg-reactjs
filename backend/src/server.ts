import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend
  credentials: true
}));

app.use(express.json());
app.use('/api', userRoutes); // This creates /api/update-credentials endpoint

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});