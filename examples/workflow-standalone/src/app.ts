/********************************************************************************
 * Copyright (c) 2019-2023 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import 'reflect-metadata';

import {
    Args,
    BaseJsonrpcGLSPClient,
    DiagramLoader,
    EditMode,
    GLSPActionDispatcher,
    GLSPClient,
    GLSPWebSocketProvider,
    IDiagramOptions,
    MessageAction,
    StatusAction
} from '@eclipse-glsp/client';
import { Container } from 'inversify';
import { join, resolve } from 'path';
import { MessageConnection } from 'vscode-jsonrpc';
import createContainer from './di.config';
const host = GLSP_SERVER_HOST;
const port = GLSP_SERVER_PORT;
const id = 'workflow';
const diagramType = 'workflow-diagram';

const baseFileInput = document.createElement('input');
baseFileInput.type = 'file';

baseFileInput.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;

    if (input && input.files) {
        const selectedFile = input.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = readerEvent => {
                if (readerEvent.target) {
                    const content = readerEvent.target.result;
                    console.log(content);
                }
            };
        }
    }
});
baseFileInput.click();

const script = document.currentScript;

if (!script) {
    throw Error('script null, can not continue');
}

const fileName = script.getAttribute('data-file-name') ? script.getAttribute('data-file-name') : 'test.wf';
const idFromScript = script.getAttribute('data-id') ? script.getAttribute('data-id') : 'sprotty-0';
const diffSide = script.getAttribute('data-diff-side');
const loc = window.location.pathname;
const currentDir = loc.substring(0, loc.lastIndexOf('/'));
const examplePath = resolve(join(currentDir, `../app/files/${fileName}`));
const clientId = idFromScript ? idFromScript : 'sprotty-0';

const webSocketUrl = `ws://${host}:${port}/${id}`;

let glspClient: GLSPClient;
let container: Container;
const wsProvider = new GLSPWebSocketProvider(webSocketUrl);
wsProvider.listen({ onConnection: initialize, onReconnect: reconnect, logger: console });

async function initialize(connectionProvider: MessageConnection, isReconnecting = false): Promise<void> {
    console.log('initialize');
    console.log(document.currentScript);
    console.log(document.currentScript?.getAttribute('data-file-name'));

    glspClient = new BaseJsonrpcGLSPClient({ id, connectionProvider });
    const containerOptions: IDiagramOptions = { clientId, diagramType, glspClientProvider: async () => glspClient, sourceUri: examplePath };
    if (fileName !== 'example_original.wf') {
        containerOptions.editMode = EditMode.READONLY;
    }
    container = createContainer(containerOptions);
    const actionDispatcher = container.get(GLSPActionDispatcher);
    const diagramLoader = container.get(DiagramLoader);

    // nur left und right brauchen die zusätzlichen args
    // left und dann diffContent = base
    // right und diffContent base
    const requestModelOptions: Args = {
        isReconnecting
    };

    if (diffSide) {
        // TODO: ATTENTION this is hardcoded - filename of base
        const baseUri = resolve(join(currentDir, '../app/files/example_original.wf'));
        /*
        const baseFileResponse = await fetch(baseUrl);

        if (!baseFileResponse.ok) {
            throw new Error(
                `Unable to Fetch Base File, Please check URL
				or Network connectivity!!`
            );
        }
        const baseFileContent = await baseFileResponse.text();
        */
        if (diffSide === 'left') {
            console.log(baseUri);
            console.log(window.location.pathname);
            const baseFileResponse = await fetch('files/example_original.wf');

            if (!baseFileResponse.ok) {
                throw new Error(
                    `Unable to Fetch Base File, Please check URL
                    or Network connectivity!!`
                );
            }
            console.log(await baseFileResponse.text());
        }

        requestModelOptions.diffSide = diffSide;
        requestModelOptions.diffUri = baseUri;
    }

    await diagramLoader.load({ requestModelOptions });

    if (isReconnecting) {
        const message = `Connection to the ${id} glsp server got closed. Connection was successfully re-established.`;
        const timeout = 5000;
        const severity = 'WARNING';
        actionDispatcher.dispatchAll([StatusAction.create(message, { severity, timeout }), MessageAction.create(message, { severity })]);
        return;
    }
}

async function reconnect(connectionProvider: MessageConnection): Promise<void> {
    glspClient.stop();
    initialize(connectionProvider, true /* isReconnecting */);
}
