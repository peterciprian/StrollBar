export const COMMON_PASSWORDS = [
	'12345678',
	'password',
	'password123',
	'Password123',
	'Password123!',
	'qwerty123',
	'letmein123',
	'welcome123',
	'admin123',
	'P@ssw0rd'
];

export const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,128}$/;
export const PASSWORD_POLICY_MESSAGE = 'Password must include uppercase, lowercase, number, and special character';
export const COMMON_PASSWORD_MESSAGE = 'This password is too common. Choose a less predictable password.';
