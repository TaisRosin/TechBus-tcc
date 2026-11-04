import { runAuthCli, reportAuthCliError } from './auth-cli';
void runAuthCli('recover-admin').catch(reportAuthCliError);
