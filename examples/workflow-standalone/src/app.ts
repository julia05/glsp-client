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
import { v4 as uuid } from 'uuid';
import { MessageConnection } from 'vscode-jsonrpc';
import createContainer from './di.config';
import { getParameters } from './url-parameters';
const host = GLSP_SERVER_HOST;
const port = GLSP_SERVER_PORT;
const id = 'workflow';
const diagramType = 'workflow-diagram';

const loc = window.location.pathname;
const currentDir = loc.substring(0, loc.lastIndexOf('/'));

const htmlParameters = getParameters();

document.getElementsByName('sprotty-div')[0].setAttribute('id', htmlParameters['sprotty-id']);

const fileName = htmlParameters['file-name'] ? htmlParameters['file-name'] : 'example1.wf';
const clientId = htmlParameters['sprotty-id'] ? htmlParameters['sprotty-id'] : 'sprotty-0';
const diffSide: string | undefined = htmlParameters['diff-side'];
const examplePath = resolve(join(currentDir, `../app/files/${fileName}`));

// TODO: ATTENTION hardcoded filename and path of base
const BASE_FILENAME = 'base.wf';
const BASE_URI = resolve(join(currentDir, `../app/files/${BASE_FILENAME}`));

const webSocketUrl = `ws://${host}:${port}/${id}`;

let glspClient: GLSPClient;
let container: Container;
const wsProvider = new GLSPWebSocketProvider(webSocketUrl);
wsProvider.listen({ onConnection: initialize, onReconnect: reconnect, logger: console });

async function initialize(connectionProvider: MessageConnection, isReconnecting = false): Promise<void> {
    glspClient = new BaseJsonrpcGLSPClient({ id, connectionProvider });
    const containerOptions: IDiagramOptions = { clientId, diagramType, glspClientProvider: async () => glspClient, sourceUri: examplePath };
    if (diffSide) {
        containerOptions.editMode = EditMode.READONLY;
    }
    container = createContainer(containerOptions);
    const actionDispatcher = container.get(GLSPActionDispatcher);
    const diagramLoader = container.get(DiagramLoader);

    const requestModelOptions: Args = {
        isReconnecting
    };

    if (diffSide) {
        // if diffSide = local or remote -> base must be loaded first
        const diffId = uuid();

        loadBase(diffId);

        requestModelOptions.diffId = diffId;
        requestModelOptions.loadFile = true;
        requestModelOptions.diffSide = diffSide;
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

function loadBase(diffId: string): void {
    const containerOptions: IDiagramOptions = {
        clientId: 'base-loader-client',
        diagramType,
        glspClientProvider: async () => glspClient,
        sourceUri: BASE_URI,
        editMode: EditMode.READONLY
    };

    const baseContainer = createContainer(containerOptions);
    const diagramLoader = baseContainer.get(DiagramLoader);

    const requestModelOptions: Args = {
        isReconnecting: false,
        diffId,
        loadFile: true,
        diffSide: 'left'
    };

    diagramLoader.load({ requestModelOptions });
}
