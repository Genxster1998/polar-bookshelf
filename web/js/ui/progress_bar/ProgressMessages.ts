import {Broadcasters} from '../../ipc/Broadcasters';
import {ProgressMessage} from './ProgressMessage';
import {AppRuntime} from '../../AppRuntime';
import {Messenger} from '../../electron/messenger/Messenger';
import {TypedMessage} from '../../util/TypedMessage';
import {Logger} from '../../logger/Logger';

const log = Logger.create();

export class ProgressMessages {

    public static CHANNEL: string = '/progress-message';

    public static broadcast(progressMessage: ProgressMessage) {

        // TODO: we should really unify how we send these ...
        if (AppRuntime.isElectron()) {

            Broadcasters.send(this.CHANNEL, progressMessage);

        } else {

            const message: TypedMessage<ProgressMessage> = {
                type: this.CHANNEL,
                value: progressMessage
            };

            Messenger.postMessage({message})
                .catch(err => log.error("Could not send message: ", err));

        }

    }

}
