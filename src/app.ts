import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import sessionRoutes from './routes/sessionRoutes';
import teacherRoutes from './routes/teacherRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/AppError';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/users', userRoutes);
app.use('/sessions', sessionRoutes);
app.use('/teachers', teacherRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(errorHandler);

export default app;
