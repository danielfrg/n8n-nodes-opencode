import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpencodeApi implements ICredentialType {
	name = 'opencodeApi';

	displayName = 'OpenCode API';

	documentationUrl = 'https://opencode.ai/docs';

	icon = {
		light: 'file:../nodes/Opencode/opencode.svg',
		dark: 'file:../nodes/Opencode/opencode.dark.svg',
	} as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:4096',
			required: true,
			description: 'The URL of your OpenCode server',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: 'opencode',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'The OPENCODE_SERVER_PASSWORD configured on the server (leave empty if unauthenticated)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/global/health',
		},
	};
}
