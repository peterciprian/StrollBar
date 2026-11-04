import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
	ApiCreatedResponse,
	ApiBearerAuth,
	ApiConflictResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
	ApiBadRequestResponse,
	ApiForbiddenResponse,
	ApiNotFoundResponse,
	ApiTooManyRequestsResponse,
	ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { RecaptchaAction, RecaptchaGuard } from '../../common/guards/recaptcha.guard';
import { PasswordResetRequestResponseDto } from './dto/password-reset-request-response.dto';
import { SocialAuthStartResponseDto } from './dto/social-auth-start-response.dto';
import { SocialLinkDto, SocialReclaimDto } from './dto/social-account-action.dto';
import { SocialHandoffDto } from './dto/social-handoff.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@ApiOperation({ summary: 'Register a new user account' })
	@ApiCreatedResponse({ type: AuthResponseDto, description: 'User registered successfully.' })
	@ApiBadRequestResponse({ description: 'Validation failed.', type: ErrorResponseDto })
	@ApiConflictResponse({ description: 'A user with the same email or username already exists.', type: ErrorResponseDto })
	@ApiForbiddenResponse({ description: 'Captcha verification failed.', type: ErrorResponseDto })
	@ApiTooManyRequestsResponse({ description: 'Registration rate limit exceeded.' })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@UseGuards(RecaptchaGuard)
	@RecaptchaAction('register')
	@Post('register')
	@Header('Cache-Control', 'no-store')
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@ApiOperation({ summary: 'Authenticate and issue access/refresh tokens' })
	@ApiCreatedResponse({ type: AuthResponseDto, description: 'Login successful.' })
	@ApiTooManyRequestsResponse({ description: 'Login rate limit exceeded.' })
	@ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('login')
	@Header('Cache-Control', 'no-store')
	login(@Body() dto: LoginDto, @Req() request: Request) {
		return this.authService.login(dto, request.ip);
	}

	@ApiOperation({ summary: 'Create a provider authorization URL for social login' })
	@ApiOkResponse({ type: SocialAuthStartResponseDto, description: 'Provider authorization URL.' })
	@ApiBadRequestResponse({ description: 'Unsupported provider or invalid redirect URI.', type: ErrorResponseDto })
	@Get('social/:provider/start-url')
	@Header('Cache-Control', 'no-store')
	getSocialStartUrl(@Param('provider') provider: string, @Query('redirectUri') redirectUri?: string, @Query('browserChallenge') browserChallenge?: string) {
		return this.authService.createSocialAuthorizationUrl(provider, redirectUri, { intent: 'login' }, browserChallenge);
	}

	@ApiOperation({ summary: 'Explicitly link a provider after current-password reauthentication (verified accounts only)' })
	@ApiBearerAuth()
	@ApiCreatedResponse({ type: SocialAuthStartResponseDto })
	@ApiUnauthorizedResponse({ description: 'Authentication, verification or reauthentication required.' })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@UseGuards(JwtAuthGuard)
	@Post('social/:provider/link/start-url')
	startSocialLink(@CurrentUser() user: AuthenticatedUser, @Param('provider') provider: string, @Body() dto: SocialLinkDto) {
		return this.authService.createSocialLinkAuthorizationUrl(user.userId, provider, dto.currentPassword, dto.redirectUri, dto.browserChallenge);
	}

	@ApiOperation({ summary: 'Explicitly reclaim an unverified registration using matching verified provider email' })
	@ApiCreatedResponse({ type: SocialAuthStartResponseDto })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('social/:provider/reclaim/start-url')
	startSocialReclaim(@Param('provider') provider: string, @Body() dto: SocialReclaimDto) {
		return this.authService.createSocialReclaimAuthorizationUrl(provider, dto.email, dto.redirectUri, dto.browserChallenge);
	}

	@ApiOperation({ summary: 'Redirect to a social login provider' })
	@ApiBadRequestResponse({ description: 'Unsupported provider or invalid redirect URI.', type: ErrorResponseDto })
	@Get('social/:provider/start')
	async startSocialLogin(
		@Param('provider') provider: string,
		@Query('redirectUri') redirectUri: string | undefined,
		@Query('browserChallenge') browserChallenge: string | undefined,
		@Res() response: { redirect(url: string): void }
	) {
		const { url } = await this.authService.createSocialAuthorizationUrl(provider, redirectUri, { intent: 'login' }, browserChallenge);
		response.redirect(url);
	}

	@ApiOperation({ summary: 'Consume a browser-bound single-use social login handoff' })
	@ApiCreatedResponse({ type: AuthResponseDto })
	@ApiUnauthorizedResponse({ description: 'Missing, mismatched, expired or consumed transaction.' })
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post('social/exchange')
	@Header('Cache-Control', 'no-store')
	exchangeSocialHandoff(@Body() dto: SocialHandoffDto) {
		return this.authService.exchangeSocialHandoff(dto);
	}

	@ApiOperation({ summary: 'Handle a social login provider callback' })
	@ApiUnauthorizedResponse({ description: 'Social login failed.', type: ErrorResponseDto })
	@Get('social/:provider/callback')
	async socialCallbackGet(
		@Param('provider') provider: string,
		@Query('code') code: string | undefined,
		@Query('state') state: string | undefined,
		@Query('error') error: string | undefined,
		@Res() response: { redirect(url: string): void }
	) {
		const redirectUrl = await this.authService.completeSocialLogin(provider, { code, state, error });
		response.redirect(redirectUrl);
	}

	@ApiOperation({ summary: 'Handle an Apple social login form callback' })
	@ApiUnauthorizedResponse({ description: 'Social login failed.', type: ErrorResponseDto })
	@Post('social/:provider/callback')
	async socialCallbackPost(
		@Param('provider') provider: string,
		@Body() body: { code?: string; state?: string; error?: string },
		@Res() response: { redirect(url: string): void }
	) {
		const redirectUrl = await this.authService.completeSocialLogin(provider, body);
		response.redirect(redirectUrl);
	}

	@ApiOperation({ summary: 'Rotate the JWT token pair using a refresh token' })
	@ApiCreatedResponse({ type: AuthResponseDto, description: 'Token pair refreshed successfully.' })
	@ApiTooManyRequestsResponse({ description: 'Refresh rate limit exceeded.' })
	@ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('refresh')
	@Header('Cache-Control', 'no-store')
	refresh(@Body() dto: RefreshTokenDto) {
		return this.authService.refresh(dto.refreshToken);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Logout and revoke the current refresh token' })
	@ApiCreatedResponse({ type: MessageResponseDto, description: 'Logout successful.' })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@ApiUnauthorizedResponse({ description: 'Invalid refresh token.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Post('logout')
	logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto, @Req() request: Request) {
		return this.authService.logout(user.userId, dto.refreshToken, request.ip);
	}

	@ApiOperation({ summary: 'Request a password reset token' })
	@ApiCreatedResponse({ type: PasswordResetRequestResponseDto, description: 'Password reset flow triggered.' })
	@ApiTooManyRequestsResponse({ description: 'Password reset request rate limit exceeded.' })
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post('password-reset/request')
	requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
		return this.authService.requestPasswordReset(dto.email, dto.preferredLanguage);
	}

	@ApiOperation({ summary: 'Reset a password using a reset token' })
	@ApiCreatedResponse({ type: MessageResponseDto, description: 'Password reset successful.' })
	@ApiTooManyRequestsResponse({ description: 'Password reset confirmation rate limit exceeded.' })
	@ApiUnauthorizedResponse({ description: 'Invalid or expired password reset token.', type: ErrorResponseDto })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('password-reset/confirm')
	resetPassword(@Body() dto: ResetPasswordDto) {
		return this.authService.resetPassword(dto.resetToken, dto.newPassword);
	}

	@ApiOperation({ summary: 'Verify an email address using a verification token' })
	@ApiCreatedResponse({ type: MessageResponseDto, description: 'Email verified successfully.' })
	@ApiTooManyRequestsResponse({ description: 'Email verification rate limit exceeded.' })
	@ApiUnauthorizedResponse({ description: 'Invalid or expired email verification token.', type: ErrorResponseDto })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post('verify-email')
	verifyEmail(@Body() dto: VerifyEmailDto) {
		return this.authService.verifyEmail(dto.token);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: "Resend the authenticated user's email verification token" })
	@ApiCreatedResponse({ type: ResendVerificationResponseDto, description: 'Verification email reissued.' })
	@ApiBadRequestResponse({ description: 'Email address is already verified.', type: ErrorResponseDto })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@ApiTooManyRequestsResponse({ description: 'Resend verification rate limit exceeded.' })
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@UseGuards(JwtAuthGuard)
	@Post('resend-verification')
	resendVerification(@CurrentUser() user: AuthenticatedUser) {
		return this.authService.resendVerificationEmail(user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Get the authenticated user profile' })
	@ApiOkResponse({ type: UserResponseDto, description: 'Authenticated user profile.' })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@UseGuards(JwtAuthGuard)
	@Get('me')
	@Header('Cache-Control', 'no-store')
	me(@CurrentUser() user: AuthenticatedUser) {
		return this.authService.me(user.userId);
	}

	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: "Change the authenticated user's password" })
	@ApiCreatedResponse({ type: MessageResponseDto, description: 'Password changed successfully.' })
	@ApiUnauthorizedResponse({ description: 'Current password is incorrect.', type: ErrorResponseDto })
	@ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@UseGuards(JwtAuthGuard)
	@Post('change-password')
	changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto, @Req() request: Request) {
		return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword, request.ip);
	}
}
