/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import { PRProvider } from './prView/prProvider';
import { Repository } from './common/models/repository';
import { Configuration } from './configuration';
import { Resource } from './common/resources';
import { ReviewManager } from './review/reviewManager';
import { CredentialStore } from './credentials';

export async function activate(context: vscode.ExtensionContext) {
	// initialize resources
	Resource.initialize(context);

	const rootPath = vscode.workspace.rootPath;

	const config = vscode.workspace.getConfiguration('github');
	const configuration = new Configuration(
		config.get<string>('username'),
		config.get<string>('host'),
		config.get<string>('accessToken')
	);
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(() => {
			const config = vscode.workspace.getConfiguration('github');
			configuration.update(
				config.get<string>('username'),
				config.get<string>('host'),
				config.get<string>('accessToken')
			);
		})
	);

	const repository = new Repository(rootPath, context.workspaceState);
	let repositoryInitialized = false;
	repository.onDidRunGitStatus(async e => {
		if (repositoryInitialized) {
			return;
		}
		repositoryInitialized = true;
		let credentialStore = new CredentialStore(configuration);
		await repository.connectGitHub(credentialStore);
		let reviewManager = new ReviewManager(context, repository, context.workspaceState);
		await (new PRProvider(context, configuration, reviewManager)).activate(repository);
	});
}