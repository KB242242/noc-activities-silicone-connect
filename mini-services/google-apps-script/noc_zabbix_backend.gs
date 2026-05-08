const ZABBIX_API_URL = PropertiesService.getScriptProperties().getProperty('ZABBIX_API_URL');
const ZABBIX_TOKEN = PropertiesService.getScriptProperties().getProperty('ZABBIX_API_TOKEN');

function zabbixRequest(method, params) {
  if (!ZABBIX_API_URL || !ZABBIX_TOKEN) {
    throw new Error('Configurer ZABBIX_API_URL et ZABBIX_API_TOKEN dans Script Properties.');
  }

  const payload = {
    jsonrpc: '2.0',
    method: method,
    params: params || {},
    auth: ZABBIX_TOKEN,
    id: 1,
  };

  const response = UrlFetchApp.fetch(ZABBIX_API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('Erreur HTTP Zabbix: ' + status + ' ' + text);
  }

  const data = JSON.parse(text);
  if (data.error) {
    throw new Error('Erreur RPC Zabbix: ' + JSON.stringify(data.error));
  }

  return data.result;
}

function getNocOverview() {
  const hosts = zabbixRequest('host.get', {
    output: ['hostid', 'host', 'available'],
    monitored_hosts: true,
  });

  const triggers = zabbixRequest('trigger.get', {
    output: ['triggerid', 'description', 'priority', 'value'],
    filter: { value: 1 },
    sortfield: 'priority',
    sortorder: 'DESC',
  });

  const events = zabbixRequest('event.get', {
    output: ['eventid', 'clock', 'name', 'severity'],
    sortfield: ['clock'],
    sortorder: 'DESC',
    limit: 50,
  });

  return {
    generatedAt: new Date().toISOString(),
    hosts: hosts,
    triggers: triggers,
    events: events,
  };
}
