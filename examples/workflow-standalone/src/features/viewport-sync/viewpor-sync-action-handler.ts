/********************************************************************************
 * Copyright (c) 2025 EclipseSource and others.
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

import { Action, EditorContextService, IActionDispatcher, IActionHandler, ICommand, SetViewportAction, TYPES } from '@eclipse-glsp/client';
import { inject, injectable } from 'inversify';

@injectable()
export class ViewportSyncActionHandler implements IActionHandler {
    @inject(EditorContextService)
    protected readonly editorContextService: EditorContextService;

    @inject(TYPES.IActionDispatcher)
    protected dispatcher: IActionDispatcher;

    handle(action: Action): ICommand | Action | void {
        console.log('--- ViewportSyncActionHandler');

        if (SetViewportAction.is(action)) {
            this.handleSetViewportSync(action);
        }
    }

    handleSetViewportSync(action: SetViewportAction): void {
        console.log('Client ID: ', this.editorContextService.clientId);
        console.log('Action: ', action);
        console.log('Context: ', this.editorContextService);

        // TODO
        // get identifier of myself, check if the action comes from me
        // dispatch the action to the other 2
        // QUESTION: how to dispatch if other 2 are in complete other context, possible through server? (switch context?)
        // elementId is the same in all 3, no problem here
        // Action can be dispatched as is, but to another context with different clientId
    }
}
