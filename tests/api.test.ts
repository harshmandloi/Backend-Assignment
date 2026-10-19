import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { Session } from '../src/models/Session';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Teacher.deleteMany({});
  await Session.deleteMany({});
});

describe('Session Booking API', () => {
  describe('POST /users', () => {
    it('creates a user with unique email', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          fullName: 'Alice Johnson',
          email: 'alice@example.com',
          phone: '+1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user._id).toBeDefined();
    });

    it('returns 409 conflict when email already exists', async () => {
      await User.create({
        fullName: 'First Alice',
        email: 'alice@example.com',
        phone: '+111111111',
      });

      const res = await request(app)
        .post('/users')
        .send({
          fullName: 'Second Alice',
          email: 'alice@example.com',
          phone: '+222222222',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          fullName: 'No Email User',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /sessions', () => {
    let teacher: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. John Doe',
        email: 'john.doe@university.edu',
        specialization: 'Computer Science',
        experience: 8,
      });
    });

    it('creates session with status AVAILABLE', async () => {
      const startTime = new Date('2026-11-01T10:00:00.000Z');
      const endTime = new Date('2026-11-01T11:00:00.000Z');

      const res = await request(app)
        .post('/sessions')
        .send({
          teacherId: teacher._id.toString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.session.status).toBe('AVAILABLE');
      expect(res.body.data.session.userId).toBeNull();
      expect(res.body.data.session.teacherId).toBe(teacher._id.toString());
    });

    it('returns 404 when teacher does not exist', async () => {
      const nonExistentTeacherId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/sessions')
        .send({
          teacherId: nonExistentTeacherId,
          startTime: '2026-11-01T10:00:00.000Z',
          endTime: '2026-11-01T11:00:00.000Z',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/teacher not found/i);
    });

    it('returns 400 when endTime is before or equal to startTime', async () => {
      const res = await request(app)
        .post('/sessions')
        .send({
          teacherId: teacher._id.toString(),
          startTime: '2026-11-01T12:00:00.000Z',
          endTime: '2026-11-01T11:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/endTime must be greater than startTime/i);
    });
  });

  describe('GET /sessions/available', () => {
    let teacher: any;
    let availableSessionToday: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Dr. Jane Smith',
        email: 'jane.smith@university.edu',
        specialization: 'Mathematics',
        experience: 12,
      });

      availableSessionToday = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-15T10:00:00.000Z'),
        endTime: new Date('2026-11-15T11:00:00.000Z'),
        status: 'AVAILABLE',
      });

      const user = await User.create({
        fullName: 'Booked User',
        email: 'booked@example.com',
        phone: '123456',
      });
      await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-11-15T14:00:00.000Z'),
        endTime: new Date('2026-11-15T15:00:00.000Z'),
        status: 'BOOKED',
      });

      await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-20T10:00:00.000Z'),
        endTime: new Date('2026-11-20T11:00:00.000Z'),
        status: 'AVAILABLE',
      });
    });

    it('returns available sessions for given date', async () => {
      const timestamp = new Date('2026-11-15T00:00:00.000Z').getTime();

      const res = await request(app).get(`/sessions/available?dateTimestamp=${timestamp}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(1);
      expect(res.body.data.sessions.length).toBe(1);
      expect(res.body.data.sessions[0]._id.toString()).toBe(availableSessionToday._id.toString());
      expect(res.body.data.sessions[0].status).toBe('AVAILABLE');
      expect(res.body.data.sessions[0].teacher.fullName).toBe('Dr. Jane Smith');
    });

    it('accepts ISO date string format in dateTimestamp', async () => {
      const res = await request(app).get('/sessions/available?dateTimestamp=2026-11-15');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.sessions[0]._id.toString()).toBe(availableSessionToday._id.toString());
    });

    it('returns 400 when dateTimestamp query parameter is missing', async () => {
      const res = await request(app).get('/sessions/available');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /sessions/:id/book', () => {
    let teacher: any;
    let user: any;
    let availableSession: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. Robert Davis',
        email: 'robert@example.com',
        specialization: 'Physics',
        experience: 5,
      });

      user = await User.create({
        fullName: 'Charlie Brown',
        email: 'charlie@example.com',
        phone: '+987654321',
      });

      availableSession = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-10T09:00:00.000Z'),
        endTime: new Date('2026-11-10T10:00:00.000Z'),
        status: 'AVAILABLE',
      });
    });

    it('books an available session and associates user', async () => {
      const res = await request(app)
        .post(`/sessions/${availableSession._id}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.session.status).toBe('BOOKED');
      expect(res.body.data.session.userId).toBe(user._id.toString());

      const updated = await Session.findById(availableSession._id);
      expect(updated?.status).toBe('BOOKED');
      expect(updated?.userId?.toString()).toBe(user._id.toString());
    });

    it('rejects booking when session is already booked', async () => {
      await request(app)
        .post(`/sessions/${availableSession._id}/book`)
        .send({ userId: user._id.toString() });

      const anotherUser = await User.create({
        fullName: 'David Copper',
        email: 'david@example.com',
        phone: '5551234',
      });

      const res = await request(app)
        .post(`/sessions/${availableSession._id}/book`)
        .send({ userId: anotherUser._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only available sessions can be booked/i);
    });

    it('returns 404 when session is not found', async () => {
      const fakeSessionId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/sessions/${fakeSessionId}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/session not found/i);
    });

    it('returns 404 when user is not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/sessions/${availableSession._id}/book`)
        .send({ userId: fakeUserId });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/user not found/i);
    });
  });

  describe('PATCH /sessions/:id/complete', () => {
    let teacher: any;
    let user: any;
    let bookedSession: any;
    let availableSession: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. Miller',
        email: 'miller@example.com',
        specialization: 'History',
        experience: 15,
      });

      user = await User.create({
        fullName: 'Emma Watson',
        email: 'emma@example.com',
        phone: '11223344',
      });

      bookedSession = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-10-01T10:00:00.000Z'),
        endTime: new Date('2026-10-01T11:00:00.000Z'),
        status: 'BOOKED',
      });

      availableSession = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-10-02T10:00:00.000Z'),
        endTime: new Date('2026-10-02T11:00:00.000Z'),
        status: 'AVAILABLE',
      });
    });

    it('marks a booked session as completed and records timestamp', async () => {
      const res = await request(app).patch(`/sessions/${bookedSession._id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.session.status).toBe('COMPLETED');
      expect(res.body.data.session.completedAt).toBeDefined();

      const dbSession = await Session.findById(bookedSession._id);
      expect(dbSession?.status).toBe('COMPLETED');
      expect(dbSession?.completedAt).not.toBeNull();
    });

    it('rejects completing an available session', async () => {
      const res = await request(app).patch(`/sessions/${availableSession._id}/complete`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only booked sessions can be marked as completed/i);
    });

    it('returns 404 when session is not found', async () => {
      const fakeSessionId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).patch(`/sessions/${fakeSessionId}/complete`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/session not found/i);
    });
  });

  describe('GET /users/:id/sessions', () => {
    let teacher: any;
    let user: any;
    let upcomingSession: any;
    let completedSession: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. Alan Turing',
        email: 'alan.turing@cs.edu',
        specialization: 'Computation',
        experience: 20,
      });

      user = await User.create({
        fullName: 'Grace Hopper',
        email: 'grace@compilers.edu',
        phone: '9988776655',
      });

      upcomingSession = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-11-25T14:00:00.000Z'),
        endTime: new Date('2026-11-25T15:00:00.000Z'),
        status: 'BOOKED',
      });

      completedSession = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-09-10T10:00:00.000Z'),
        endTime: new Date('2026-09-10T11:00:00.000Z'),
        status: 'COMPLETED',
        completedAt: new Date('2026-09-10T11:05:00.000Z'),
      });
    });

    it('returns upcoming and completed sessions for user', async () => {
      const res = await request(app).get(`/users/${user._id}/sessions`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.upcomingSessions).toBeDefined();
      expect(res.body.data.completedSessions).toBeDefined();

      expect(res.body.data.upcomingSessions.length).toBe(1);
      expect(res.body.data.upcomingSessions[0]._id.toString()).toBe(upcomingSession._id.toString());
      expect(res.body.data.upcomingSessions[0].status).toBe('BOOKED');
      expect(res.body.data.upcomingSessions[0].teacher.fullName).toBe('Prof. Alan Turing');

      expect(res.body.data.completedSessions.length).toBe(1);
      expect(res.body.data.completedSessions[0]._id.toString()).toBe(completedSession._id.toString());
      expect(res.body.data.completedSessions[0].status).toBe('COMPLETED');
      expect(res.body.data.completedSessions[0].teacher.fullName).toBe('Prof. Alan Turing');
    });

    it('returns 404 when user is not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).get(`/users/${fakeUserId}/sessions`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/user not found/i);
    });
  });
});
