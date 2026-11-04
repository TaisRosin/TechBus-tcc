import { runAuthCli, reportAuthCliError } from './auth-cli';
void runAuthCli('bootstrap').catch(reportAuthCliError);
