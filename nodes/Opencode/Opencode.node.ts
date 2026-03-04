import {
	NodeConnectionTypes,
	NodeApiError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class Opencode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenCode',
		name: 'opencode',
		icon: { light: 'file:opencode.svg', dark: 'file:opencode.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Send a message',
		description: 'Send a message to an OpenCode server and get the AI response',
		defaults: {
			name: 'OpenCode',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'opencodeApi', required: true }],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 4,
				},
				description: 'The message to send to OpenCode',
			},
			{
				displayName: 'Directory',
				name: 'directory',
				type: 'string',
				default: '',
				description: 'Project directory on the server (optional)',
			},
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'string',
				default: '',
				description: 'Which agent to use, e.g. "code" or "task" (optional)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Dynamic import for ESM-only SDK in CJS context
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const sdk: any = await Function('return import("@opencode-ai/sdk/client")')();

		const credentials = await this.getCredentials('opencodeApi');
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const text = this.getNodeParameter('text', i) as string;
			const directory = this.getNodeParameter('directory', i, '') as string;
			const agent = this.getNodeParameter('agent', i, '') as string;

			const password = credentials.password as string;
			const headers: Record<string, string> = {};
			if (password) {
				headers.Authorization =
					'Basic ' + Buffer.from(`${credentials.username}:${password}`).toString('base64');
			}

			const client = sdk.createOpencodeClient({
				baseUrl: credentials.baseUrl as string,
				...(directory ? { directory } : {}),
				headers,
			});

			const session = await client.session.create({});
			if (session.error) {
				throw new NodeApiError(
					this.getNode(),
					{},
					{
						message: `Failed to create session: ${JSON.stringify(session.error)}`,
					},
				);
			}

			const response = await client.session.prompt({
				path: { id: session.data.id },
				body: {
					parts: [{ type: 'text' as const, text }],
					...(agent ? { agent } : {}),
				},
			});
			if (response.error) {
				throw new NodeApiError(
					this.getNode(),
					{},
					{
						message: `Failed to send prompt: ${JSON.stringify(response.error)}`,
					},
				);
			}

			const textParts = response.data.parts.filter(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(p: any) => p.type === 'text',
			);
			const responseText = textParts
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.map((p: any) => p.text ?? '')
				.join('\n');

			results.push({
				json: {
					sessionId: session.data.id,
					response: responseText,
					cost: response.data.info.cost,
					tokens: response.data.info.tokens,
					parts: response.data.parts,
					info: response.data.info,
				},
			});
		}

		return [results];
	}
}
