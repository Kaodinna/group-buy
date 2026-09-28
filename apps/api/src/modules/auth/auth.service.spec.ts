import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { ReferralsService } from '../referrals/referrals.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { hashPassword } from '../../common/utils/password.util.js';

function makeUserDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-id-1' },
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '+2348000000000',
    role: Role.CUSTOMER,
    avatar: null,
    isVerified: false,
    isActive: true,
    referralCode: 'ADAX1234',
    referredBy: null,
    tokenVersion: 0,
    password: '',
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByReferralCode: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    incrementTokenVersion: ReturnType<typeof vi.fn>;
    toPublicUser: ReturnType<typeof vi.fn>;
  };
  let referralsService: { createForRegistration: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByReferralCode: vi.fn(),
      create: vi.fn(),
      incrementTokenVersion: vi.fn(),
      toPublicUser: vi.fn((user) => ({ id: user._id.toString(), email: user.email })),
    };
    referralsService = { createForRegistration: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: ReferralsService, useValue: referralsService },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, string> = {
                'jwt.secret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              return values[key];
            },
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and issues tokens', async () => {
      const created = makeUserDoc();
      usersService.create.mockResolvedValue(created);

      const result = await authService.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+2348000000000',
        password: 'password123',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com', role: Role.CUSTOMER }),
      );
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user).toEqual({ id: 'user-id-1', email: 'ada@example.com' });
    });

    it('resolves referredBy from a valid referral code', async () => {
      usersService.findByReferralCode.mockResolvedValue(
        makeUserDoc({ _id: { toString: () => 'referrer-id' } }),
      );
      usersService.create.mockResolvedValue(makeUserDoc());

      await authService.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+2348000000000',
        password: 'password123',
        referralCode: 'REFCODE1',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ referredBy: { toString: expect.any(Function) } }),
      );
      expect(referralsService.createForRegistration).toHaveBeenCalled();
    });

    it('ignores an unknown referral code instead of failing registration', async () => {
      usersService.findByReferralCode.mockResolvedValue(null);
      usersService.create.mockResolvedValue(makeUserDoc());

      await expect(
        authService.register({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '+2348000000000',
          password: 'password123',
          referralCode: 'DOES-NOT-EXIST',
        }),
      ).resolves.toBeDefined();

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ referredBy: null }),
      );
      expect(referralsService.createForRegistration).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unknown email with a generic message', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an inactive account', async () => {
      const passwordHash = await hashPassword('password123');
      usersService.findByEmail.mockResolvedValue(
        makeUserDoc({ isActive: false, password: passwordHash }),
      );

      await expect(
        authService.login({ email: 'ada@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      const passwordHash = await hashPassword('correct-password');
      usersService.findByEmail.mockResolvedValue(makeUserDoc({ password: passwordHash }));

      await expect(
        authService.login({ email: 'ada@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues tokens for valid credentials', async () => {
      const passwordHash = await hashPassword('password123');
      usersService.findByEmail.mockResolvedValue(makeUserDoc({ password: passwordHash }));

      const result = await authService.login({
        email: 'ada@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('increments the token version to invalidate outstanding tokens', async () => {
      await authService.logout('user-id-1');
      expect(usersService.incrementTokenVersion).toHaveBeenCalledWith('user-id-1');
    });
  });
});
