const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../Src/app');
const Candidate = require('../Src/models/candidate');
const Position = require('../Src/models/position');
const User = require('../Src/models/user');
const jwt = require('jsonwebtoken');

describe('Candidates API', () => {
  let adminToken;
  let voterToken;
  let positionId;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-election-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test user
    const user = new User({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password',
      role: 'admin'
    });
    await user.save();
    userId = user._id;

    // Create test position
    const position = new Position({
      title: 'President',
      election: new mongoose.Types.ObjectId() // dummy election id
    });
    await position.save();
    positionId = position._id;

    // Generate tokens
    adminToken = jwt.sign({ id: user._id, role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
    voterToken = jwt.sign({ id: user._id, role: 'voter' }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('POST /api/candidates', () => {
    it('should create candidate with admin permission', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'John Doe')
        .field('manifesto', 'I will improve education')
        .field('positionId', positionId.toString())
        .field('userId', userId.toString())
        .attach('photo', Buffer.from('fake image'), 'test.jpg');

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('John Doe');
      expect(res.body.data.manifesto).toBe('I will improve education');
      expect(res.body.data.photo).toBeDefined();
    });

    it('should reject creation without admin permission', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${voterToken}`)
        .field('name', 'Jane Doe')
        .field('manifesto', 'Vote for me')
        .field('positionId', positionId.toString())
        .field('userId', userId.toString());

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('name', 'Jane Doe')
        .field('manifesto', 'Vote for me')
        .field('positionId', positionId.toString())
        .field('userId', userId.toString());

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/candidates', () => {
    it('should get all candidates with authentication', async () => {
      const res = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/candidates');

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/candidates/:id', () => {
    let candidateId;

    beforeAll(async () => {
      const candidate = new Candidate({
        name: 'Test Candidate',
        manifesto: 'Test manifesto',
        position: positionId,
        user: userId
      });
      await candidate.save();
      candidateId = candidate._id;
    });

    it('should get single candidate', async () => {
      const res = await request(app)
        .get(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Candidate');
    });

    it('should return 404 for non-existent candidate', async () => {
      const res = await request(app)
        .get('/api/candidates/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/candidates/:id', () => {
    let candidateId;

    beforeAll(async () => {
      const candidate = new Candidate({
        name: 'Update Test',
        manifesto: 'Old manifesto',
        position: positionId,
        user: userId
      });
      await candidate.save();
      candidateId = candidate._id;
    });

    it('should update candidate with admin permission', async () => {
      const res = await request(app)
        .put(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          manifesto: 'Updated manifesto'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should reject update without admin permission', async () => {
      const res = await request(app)
        .put(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/candidates/:id', () => {
    let candidateId;

    beforeAll(async () => {
      const candidate = new Candidate({
        name: 'Delete Test',
        manifesto: 'To be deleted',
        position: positionId,
        user: userId
      });
      await candidate.save();
      candidateId = candidate._id;
    });

    it('should delete candidate with admin permission', async () => {
      const res = await request(app)
        .delete(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject delete without admin permission', async () => {
      const candidate = new Candidate({
        name: 'Delete Test 2',
        manifesto: 'To be deleted 2',
        position: positionId,
        user: userId
      });
      await candidate.save();

      const res = await request(app)
        .delete(`/api/candidates/${candidate._id}`)
        .set('Authorization', `Bearer ${voterToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/candidates/election/:electionId', () => {
    it('should get candidates by election', async () => {
      const res = await request(app)
        .get('/api/candidates/election/507f1f77bcf86cd799439011') // dummy id
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/candidates/position/:positionId', () => {
    it('should get candidates by position', async () => {
      const res = await request(app)
        .get(`/api/candidates/position/${positionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
