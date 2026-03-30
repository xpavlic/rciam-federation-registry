let cs = {};

class ServicePoliciesRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
    cs = new pgp.helpers.ColumnSet(['owner_id', 'name', 'url', 'url_czech']);
  }

  async add(type, data, id) {
    let table = 'service_policies';
    if (type === 'petition') {
      table = 'service_petition_policies';
    }
    if (data && data.length > 0) {
      let values = [];
      data.forEach((item) => {
        values.push({
          owner_id: id,
          name: item.name,
          url: item.url,
          url_czech: item.url_czech || item.url
        });
      });
      const query = this.pgp.helpers.insert(values, cs, table);
      return this.db.none(query).then(() => 'success').catch(() => 'error');
    }
    return null;
  }

  async delete_one_or_many(type, data, owner_id) {
    let table = 'service_policies';
    if (type === 'petition') {
      table = 'service_petition_policies';
    }
    const tableName = new this.pgp.helpers.TableName({ table });
    let values = '';
    if (data.length > 0) {
      data.forEach((item) => {
        values = values + "('" + item.name + "','" + item.url + "','" + (item.url_czech || item.url) + "'),";
      });
      values = values.slice(0, -1);
      return this.db.none('DELETE FROM $3 WHERE owner_id=$1 AND (name,url,COALESCE(url_czech,url)) IN ($2^)', [
        +owner_id,
        values,
        tableName
      ]);
    }
    return null;
  }
}

module.exports = ServicePoliciesRepository;
