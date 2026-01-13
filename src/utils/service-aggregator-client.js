import { createHttpClient } from './httpClient'

const httpClient = createHttpClient()

class ServiceAggregatorClient {
  async getAggregates() {
    const response = await httpClient.get('/aggregate/get')
    return response.data
  }

  async getAggregateByid(id) {
    const response = await httpClient.get(`/aggregate/get/${id}`)
    return response.data
  }

  async getServices() {
    const response = await httpClient.get('/service/get-services')
    return response.data
  }
  async getServicesById(id) {
    const response = await httpClient.get(`/service/get-services/${id}`)
    return response.data
  }

  async createAggregate(data) {
    const response = await httpClient.post('aggregate/create', data)
    return response.data
  }

  async updateAggregate(data) {
    const response = await httpClient.post(`aggregate/update`, data)
    return response.data
  }

  async deleteAggregate(id) {
    const response = await httpClient.post(`aggregate/delete`, id)
    return response.data
  }

  async createService(data) {
    const response = await httpClient.post('/service/create-service', data)
    return response.data
  }

  async updateService(data) {
    const response = await httpClient.post(`/service/update-service`, data)
    return response.data
  }
  async deleteService(id){
    const response = await httpClient.post(`/service/delete-service`, data)
    return response.data

  }

  async addAggregateStep(data) {
    console.log('Adding aggregate step with data:', data);
    const response = await httpClient.post('/step/add',data)
    return response.data
  }

  async updateAggregateStep(data) {
    const response = await httpClient.post(`/step/update`, data)
    return response.data
  }

  async deleteAggregateStep(id) {
    const response = await httpClient.post(`/step/delete`, id)
    return response.data
  }

  async addAggregateStepMapping(data) {
    const response = await httpClient.post('/aggregate-mapping/add', data)
    return response.data
  }

  async updateAggregateStepMapping(data) {
    const response = await httpClient.post(`/aggregate-mapping/update`, data)
    return response.data
  }
  async deleteAggregateStepMapping(id) {
    const response = await httpClient.post(`/aggregate-mapping/delete`, id)
    return response.data
  }
}

export default new ServiceAggregatorClient()

