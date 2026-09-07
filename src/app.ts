import express from 'express';
import bookingRoutes from './routes/bookingRoutes.js';

const app = express();
app.use(express.json());

app.use('/api', bookingRoutes);
app.get('/', (req, res) => {
    res.send('Welcome to the Ticket Booking API');
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});