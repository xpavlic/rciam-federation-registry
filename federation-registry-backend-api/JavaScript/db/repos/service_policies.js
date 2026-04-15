let cs = {};
const {getLocalizedPolicyUrlField, withLocalizedPolicyAliases} = require('../../functions/localizedFields');

class ServicePoliciesRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
    this._policyUrlColumnByTable = {};
    this.localizedPolicyUrlField = getLocalizedPolicyUrlField();
    this.legacyPolicyUrlField = 'url_localized';
    cs.withoutLocalizedUrl = new pgp.helpers.ColumnSet(['owner_id', 'name', 'url']);
  }

  async getPolicyUrlColumn(table) {
    if (this._policyUrlColumnByTable[table] !== undefined) {
      return this._policyUrlColumnByTable[table];
    }
    const localizedResult = await this.db.oneOrNone(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2",
      [table, this.localizedPolicyUrlField]
    );
    if (localizedResult) {
      this._policyUrlColumnByTable[table] = this.localizedPolicyUrlField;
      return this._policyUrlColumnByTable[table];
    }
    const legacyResult = await this.db.oneOrNone(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2",
      [table, this.legacyPolicyUrlField]
    );
    this._policyUrlColumnByTable[table] = legacyResult ? this.legacyPolicyUrlField : null;
    return this._policyUrlColumnByTable[table];
  }

  async add(type, data, id) {
    let table = 'service_policies';
    if (type === 'petition') {
      table = 'service_petition_policies';
    }
    if (data && data.length > 0) {
      const policyUrlColumn = await this.getPolicyUrlColumn(table);
      const insertColumnSet = policyUrlColumn
        ? new this.pgp.helpers.ColumnSet(['owner_id', 'name', 'url', {name: policyUrlColumn}], {table: null})
        : cs.withoutLocalizedUrl;
      let values = [];
      data.forEach((item) => {
        const normalizedPolicy = withLocalizedPolicyAliases({...item});
        const row = {
          owner_id: id,
          name: normalizedPolicy.name,
          url: normalizedPolicy.url,
        };
        if (policyUrlColumn) {
          row[policyUrlColumn] = normalizedPolicy[policyUrlColumn] || normalizedPolicy.url;
        }
        values.push(row);
      });
      const query = this.pgp.helpers.insert(values, insertColumnSet, table);
      return this.db.none(query).then(() => 'success');
    }
    return null;
  }

  async delete_one_or_many(type, data, owner_id) {
    let table = 'service_policies';
    if (type === 'petition') {
      table = 'service_petition_policies';
    }
    const tableName = new this.pgp.helpers.TableName({ table });
    if (data.length > 0) {
      const policyUrlColumn = await this.getPolicyUrlColumn(table);
      const valuesData = data.map((item) => ({
        name: item.name,
        url: item.url,
        localized_url_or_url: withLocalizedPolicyAliases({...item})[policyUrlColumn || this.localizedPolicyUrlField] || item.url
      }));
      const csDelete = new this.pgp.helpers.ColumnSet(
        ['name', 'url', { name: 'localized_url_or_url' }],
        { table: null }
      );
      const values = this.pgp.helpers.values(valuesData, csDelete);
      if (policyUrlColumn) {
        const policyUrlColumnSql = this.pgp.as.name(policyUrlColumn);
        return this.db.none(
          `DELETE FROM $3 WHERE owner_id=$1 AND (name,url,COALESCE(${policyUrlColumnSql},url)) IN ($2:raw)`,
          [
            +owner_id,
            values,
            tableName
          ]
        );
      }
      return this.db.none(
        'DELETE FROM $3 WHERE owner_id=$1 AND (name,url) IN (SELECT v.name, v.url FROM (VALUES $2:raw) AS v(name,url,localized_url_or_url))',
        [
          +owner_id,
          values,
          tableName
        ]
      );
    }
    return null;
  }
}

module.exports = ServicePoliciesRepository;
