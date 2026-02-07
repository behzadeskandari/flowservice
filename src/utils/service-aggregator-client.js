import { createHttpClient } from './httpClient'

const httpClient = createHttpClient()

class ServiceAggregatorClient {

  //#region services
  async getServices() {
    const response = await httpClient.get('/service/get')
    return response.data
  }
  async getServicesById(id) {
    const response = await httpClient.get(`/service/get/${id}`)
    return response.data
  }
  async getServicesWithParams(data) {
    var record = await httpClient.get(`/service/get?PageIndex=${data.PageIndex}&PageSize=${data.PageSize}`)

    return record.data;
  }
  async getServicesWithParamsWithSearch(data) {
    var record = await httpClient.get(`/service/get?PageIndex=${data.PageIndex}&PageSize=${data.PageSize}&Status=${data.Status}&Name=${data.Name}&URL=${data.URL}`)
    return record.data;
  }

  async createService(data) {
    const response = await httpClient.post('/service/create', data)
    return response.data
  }

  async updateService(data) {
    const response = await httpClient.post(`/service/update`, data)
    return response.data
  }
  async deleteService(id) {
    const response = await httpClient.post(`/service/delete`, { id: id })
    return response.data
  }
  //#endregion services

  //#region Aggregate
  async createAggregate(data) {
    const response = await httpClient.post('aggregate/create', data)
    return response.data
  }
  async updateAggregate(data) {
    const response = await httpClient.post(`aggregate/update`, data)
    return response.data
  }

  async deleteAggregate(id) {
    const response = await httpClient.post(`aggregate/delete`, { id: id })
    return response.data
  }

  async getAggregates() {
    const response = await httpClient.get('/aggregate/get')
    return response.data
  }
  async getAggregatesWithParams(data) {
    const response = await httpClient.get(`/aggregate/get?PageIndex=${data.PageIndex}&PageSize=${data.PageSize}`)
    return response.data
  }

  async getAggregatesWithParamsWithSearch(data) {//?Name=refe12&Status=true&PageIndex=1&PageSize=10
    const response = await httpClient.get(`/aggregate/get?PageIndex=${data.PageIndex}&PageSize=${data.PageSize}&Name=${data.Name}&Status=${data.Status}`)
    return response.data
  }
  async getAggregateByid(id) {
    const response = await httpClient.get(`/aggregate/get/${id}`)
    return response.data
  }
  //#endregion Aggregate

  //#region Aggregate-step
  async addAggregateStep(data) {
    console.log('Adding aggregate step with data:', data);
    const response = await httpClient.post('/step/add', data)
    return response.data
  }

  async updateAggregateStep(data) {
    const response = await httpClient.post(`/step/update`, data)
    return response.data
  }

  async deleteAggregateStep(id) {
    const response = await httpClient.post(`/step/delete`, { id: id })
    return response.data
  }
  //#endregion Aggregate-step

  //#region AggregateStepMapping
  async addAggregateStepMapping(data) {
    const response = await httpClient.post('/aggregate-step-mapping/add', data)
    return response.data
  }

  async updateAggregateStepMapping(data) {
    const response = await httpClient.post(`/aggregate-step-mapping/update`, data)
    return response.data
  }
  async deleteAggregateStepMapping(id) {
    const response = await httpClient.post(`/aggregate-step-mapping/delete`, { id: id })
    return response.data
  }
  //#endregion AggregateStepMapping

  //#region AggregateMapping

  async addAggregateMapping(data) {
    const response = await httpClient.post('/aggregate-mapping/add', data)
    return response.data
  }

  async updateAggregateMapping(data) {
    const response = await httpClient.post(`/aggregate-mapping/update`, data)
    return response.data
  }

  async deleteAggregateMapping(id) {
    const response = await httpClient.post(`/aggregate-mapping/delete`, {id: id})
    return response.data
  }

  //#endregion AggregateMapping


  //#region serviceMapping

async addServiceMapping(data) {
    // Convert to plain object to avoid circular references with Vue reactivity
    const plainData = typeof data === 'object' && data !== null ? JSON.parse(JSON.stringify(data)) : data
    const response = await httpClient.post('/service-mapping/add', plainData[0])
    return response.data
  }

  async updateServiceMapping(data) {
    // Convert to plain object to avoid circular references with Vue reactivity
    const plainData = typeof data === 'object' && data !== null ? JSON.parse(JSON.stringify(data)) : data
    const response = await httpClient.post(`/service-mapping/update`, plainData[0])
    return response.data
  }

  async deleteServiceMapping(id) {
    const response = await httpClient.post(`/service-mapping/delete`, id)
    return response.data
  }

  //#endregion serviceMapping


  //#region Execute Aggregate

  async executeAggregate(data) {
    const payload = {
      id: data.id,
      ...data.data
    }
    const response = await httpClient.post(`/execute/${data.id}`, payload)
    return response.data
  }

  async getExecutionDetails(trackerId) {
    const response = await httpClient.get(`/executelog/get/${trackerId}`)
    return response.data
  }
  //#endregion Execute Aggregate

  async getCaptcha(){
    const response = await httpClient.get('/auth/captcha')
    return response.data
  }
}

export default new ServiceAggregatorClient()

