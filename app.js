import express           from 'express';
import compression       from 'compression';
import crypto            from 'crypto';
import path              from 'path';
import { fileURLToPath } from 'url';
import { helmetMiddleware, corsMiddleware } from './middleware/security.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import httpLogger        from './middleware/httpLogger.js';
import notFound          from './middleware/notFound.js';
import errorHandler      from './middleware/errorHandler.js';

import healthRoute       from './routes/health.route.js';
import authRoute         from './routes/auth.route.js';
import patientRoute      from './routes/patient.route.js';
import userRoute         from './routes/user.route.js';
import departmentRoute   from './routes/department.route.js';
import doctorRoute       from './routes/doctor.route.js';
import appointmentRoute  from './routes/appointment.route.js';
import medicalRoute      from './routes/medical.route.js';
import labRoute          from './routes/lab.route.js';
import inquiryRoute      from './routes/inquiry.route.js';
import donationRoute     from './routes/donation.route.js';
import adminRoute        from './routes/admin.route.js';
import heroBannerRoute   from './routes/heroBanner.route.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.set('trust proxy', 1);
app.use(compression());
app.use(httpLogger);
app.use('/api/donations/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', globalLimiter);

app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/patient', patientRoute);
app.use('/api/users', userRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/doctors', doctorRoute);
app.use('/api/appointments', appointmentRoute);
app.use('/api/medical', medicalRoute);
app.use('/api/lab', labRoute);
app.use('/api/inquiries', inquiryRoute);
app.use('/api/donations', donationRoute);
app.use('/api/admin', adminRoute);
app.use('/api/hero-banners', heroBannerRoute);

app.use(notFound);
app.use(errorHandler);

export default app;
