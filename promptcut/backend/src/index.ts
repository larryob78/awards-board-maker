// PromptCut Backend Server
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { query } from './utils/db';

// Import routes
import projectsRoutes from './routes/projects.routes';
import uploadRoutes from './routes/upload.routes';
import mediaRoutes from './routes/media.routes';
import aiRoutes from './routes/ai.routes';
import timelineRoutes from './routes/timeline.routes';
import exportRoutes from './routes/export.routes';
import jobsRoutes from './routes/jobs.routes';

// Import queue service to start workers
import './services/queue.service';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// API Routes
app.use('/api/projects', projectsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/jobs', jobsRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'PromptCut API',
    version: '1.0.0',
    description: 'Prompt-driven video editing platform',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      upload: '/api/upload',
      media: '/api/media',
      ai: '/api/ai',
      timeline: '/api/timeline',
      export: '/api/export',
      jobs: '/api/jobs',
    },
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  logger.info('WebSocket connected', { ip: req.socket.remoteAddress });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.debug('WebSocket message', { data });

      // Handle different message types
      switch (data.type) {
        case 'subscribe':
          // Subscribe to project updates
          (ws as any).projectId = data.project_id;
          ws.send(JSON.stringify({ type: 'subscribed', project_id: data.project_id }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          logger.warn('Unknown WebSocket message type', { type: data.type });
      }
    } catch (error) {
      logger.error('WebSocket message error', { error });
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket disconnected');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error });
  });
});

// Broadcast function for job updates
export const broadcastJobUpdate = (projectId: string, jobId: string, data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && (client as any).projectId === projectId) {
      client.send(JSON.stringify({
        type: 'job_update',
        job_id: jobId,
        ...data,
      }));
    }
  });
};

// Start server
server.listen(PORT, () => {
  logger.info(`PromptCut API server running`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
