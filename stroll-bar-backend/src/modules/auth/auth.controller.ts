import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { PasswordResetRequestResponseDto } from './dto/password-reset-request-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'User registered successfully.' })
  @ApiBadRequestResponse({ description: 'Validation failed.', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'A user with the same email or username already exists.', type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Registration rate limit exceeded.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Authenticate and issue access/refresh tokens' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Login successful.' })
  @ApiTooManyRequestsResponse({ description: 'Login rate limit exceeded.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Rotate the JWT token pair using a refresh token' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Token pair refreshed successfully.' })
  @ApiTooManyRequestsResponse({ description: 'Refresh rate limit exceeded.' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('refresh')
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
  logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto) {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiCreatedResponse({ type: PasswordResetRequestResponseDto, description: 'Password reset flow triggered.' })
  @ApiTooManyRequestsResponse({ description: 'Password reset request rate limit exceeded.' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
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

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto, description: 'Authenticated user profile.' })
  @ApiNotFoundResponse({ description: 'No active user found.', type: ErrorResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }
}
