import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';

jest.setTimeout(30000);

describe('StrollBar API (e2e)', () => {
  const dbLocation = join(process.cwd(), 'test', 'strollbar.e2e.sqlite');
  let app: INestApplication;
  let accessToken = '';
  let refreshToken = '';
  let strollId = '';
  let stageId = '';
  let adventureId = '';
  let userId = '';

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_TYPE = 'sqljs';
    process.env.DB_LOCATION = dbLocation;
    process.env.DB_AUTO_SAVE = 'true';
    process.env.DB_MIGRATIONS_RUN = 'true';
    process.env.S3_REGION = 'auto';
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000';
    process.env.S3_BUCKET_NAME = 'strollbar-media-test';
    process.env.S3_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.S3_PUBLIC_BASE_URL = 'https://cdn.test.example.com/strollbar-media';
    process.env.S3_FORCE_PATH_STYLE = 'true';

    if (existsSync(dbLocation)) {
      rmSync(dbLocation, { force: true });
    }

    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (existsSync(dbLocation)) {
      rmSync(dbLocation, { force: true });
    }
  });

  it('registers and logs in a user', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        username: 'walker',
        email: 'walker@example.com',
        password: 'Password123!',
      })
      .expect(201);

    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();
    expect(registerResponse.body.user.email).toBe('walker@example.com');
    expect(registerResponse.body.user.passwordHash).toBeUndefined();
    expect(registerResponse.body.user.refreshTokenHash).toBeUndefined();
    userId = registerResponse.body.user.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'walker@example.com',
        password: 'Password123!',
      })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();
    expect(loginResponse.body.user.id).toBe(userId);
    accessToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;
  });

  it('reports degraded health when object storage is unreachable', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(503);

    expect(response.body.status).toBe('degraded');
    expect(response.body.database.status).toBe('up');
    expect(response.body.storage.status).toBe('down');
  });

  it('refreshes the JWT token pair', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.id).toBe(userId);

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('logs out and revokes the refresh token', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'walker@example.com',
        password: 'Password123!',
      })
      .expect(201);

    accessToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;
  });

  it('returns the authenticated user from /auth/me', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.id).toBe(userId);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('creates a stroll, adds a stage, unlocks an adventure, and submits an answer', async () => {
    const createStrollResponse = await request(app.getHttpServer())
      .post('/v1/strolls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Budapest Highlights',
        description: 'A short guided route through the city center.',
        labels: ['city', 'architecture'],
      })
      .expect(201);

    expect(createStrollResponse.body.authorId).toBe(userId);
    strollId = createStrollResponse.body.id;

    const createStageResponse = await request(app.getHttpServer())
      .post(`/v1/strolls/${strollId}/stages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        orderIndex: 1,
        name: 'Parliament',
        description: 'Solve the riddle to continue.',
        address: 'Kossuth Lajos ter 1-3',
        riddleAnswer: 'neo-gothic',
      })
      .expect(201);

    expect(createStageResponse.body.strollId).toBe(strollId);
    stageId = createStageResponse.body.id;

    const unlockResponse = await request(app.getHttpServer())
      .post('/v1/adventures/unlock')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ strollId })
      .expect(201);

    expect(unlockResponse.body.ownerUserId).toBe(userId);
    adventureId = unlockResponse.body.id;

    const answerResponse = await request(app.getHttpServer())
      .post(`/v1/adventures/${adventureId}/stages/${stageId}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ answer: 'neo-gothic' })
      .expect(201);

    expect(answerResponse.body.isCorrect).toBe(true);
    expect(answerResponse.body.adventure.progressStatus).toBe('completed');
  });

  it('requests a password reset, confirms it, and allows login with the new password', async () => {
    const requestResetResponse = await request(app.getHttpServer())
      .post('/v1/auth/password-reset/request')
      .send({ email: 'walker@example.com' })
      .expect(201);

    expect(requestResetResponse.body.message).toContain('password reset token');
    expect(requestResetResponse.body.resetToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/v1/auth/password-reset/confirm')
      .send({
        resetToken: requestResetResponse.body.resetToken,
        newPassword: 'EvenBetterPass123!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'walker@example.com',
        password: 'Password123!',
      })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'walker@example.com',
        password: 'EvenBetterPass123!',
      })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();
    accessToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;
  });

  it('rate limits repeated login attempts', async () => {
    let rateLimited = false;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'walker@example.com',
          password: 'EvenBetterPass123!',
        });

      if (response.status === 429) {
        rateLimited = true;
        break;
      }

      expect(response.status).toBe(201);
    }

    expect(rateLimited).toBe(true);
  });

  it('creates a presigned media upload URL', async () => {
    const mediaResponse = await request(app.getHttpServer())
      .post('/v1/media/presign-upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileName: 'cover.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 5242880,
        purpose: 'stroll',
        entityId: strollId,
      })
      .expect(201);

    expect(mediaResponse.body.objectKey).toContain('stroll/');
    expect(mediaResponse.body.assetId).toBeDefined();
    expect(mediaResponse.body.uploadUrl).toContain('127.0.0.1:9000');
    expect(mediaResponse.body.publicUrl).toContain('https://cdn.test.example.com/strollbar-media/');
    expect(mediaResponse.body.method).toBe('PUT');
  });

  it('rejects multipart upload initiation for files below the multipart threshold', async () => {
    await request(app.getHttpServer())
      .post('/v1/media/multipart/initiate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fileName: 'walkthrough.mp4',
        contentType: 'video/mp4',
        sizeBytes: 1024,
        purpose: 'stage',
        entityId: stageId,
      })
      .expect(400);
  });
});
