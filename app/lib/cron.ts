import cronstrue from 'cronstrue';
import cronParser from 'cron-parser';

export function cronToText(cronExpression: string) {
    try {
        cronParser.parseExpression(cronExpression)
        return {
            text: cronstrue.toString(cronExpression)
        };
    } catch (err) {
        if (err instanceof Error) {
            return {
                error: `Error: ${err.message}`
            }
        } else {
            return {
                error: `An unknown error occurred.`
            }
        }
    }
}
