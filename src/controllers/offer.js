const offerService = require('~/services/offer')
const offerAggregateOptions = require('~/utils/offers/offerAggregateOptions')

const getOffers = async (req, res) => {
  const decodedSearch = decodeURIComponent(req.query.search || '')
  const searchTerms = decodedSearch.trim().split(/\s+/).filter(Boolean)

  let searchContext = req.query.searchContext
  if (!searchContext) {
    if (req.params && req.params.id) searchContext = 'subject'
    else if (req.query && (req.query.categoryId || req.query.subjectId)) searchContext = 'subject'
    else searchContext = 'tutor'
  }

  if (searchTerms.length > 1) {
    const allOffers = []

    for (const term of searchTerms) {
      const pipeline = offerAggregateOptions({ ...req.query, search: term, searchContext }, req.params)
      const response = await offerService.getOffers(pipeline)
      if (response && typeof response === 'object' && Array.isArray(response.items)) {
        allOffers.push(...response.items)
      } else if (Array.isArray(response)) {
        allOffers.push(...response)
      }
    }

    const uniqueMap = new Map()
    for (const offer of allOffers) {
      const key = offer && offer._id ? String(offer._id) : JSON.stringify(offer)
      if (!uniqueMap.has(key)) uniqueMap.set(key, offer)
    }
    const uniqueOffers = Array.from(uniqueMap.values())
    return res.status(200).json(uniqueOffers)
  }

  const pipeline = offerAggregateOptions({ ...req.query, search: decodedSearch, searchContext }, req.params)
  const response = await offerService.getOffers(pipeline)

  if (response && typeof response === 'object' && (Array.isArray(response.items) || typeof response.count !== 'undefined')) {
    return res.status(200).json(response)
  }

  return res.status(200).json(Array.isArray(response) ? response : (response?.items ?? []))
}

const getOfferById = async (req, res) => {
  const { id } = req.params
  const offer = await offerService.getOfferById(id)
  res.status(200).json(offer)
}

const createOffer = async (req, res) => {
  const { id: authorId, role: authorRole } = req.user
  const data = req.body
  const newOffer = await offerService.createOffer(authorId, authorRole, data)
  res.status(201).json(newOffer)
}

const updateOffer = async (req, res) => {
  const { id } = req.params
  const updateData = req.body
  const { id: currentUserId } = req.user
  await offerService.updateOffer(id, currentUserId, updateData)
  res.status(204).end()
}

const deleteOffer = async (req, res) => {
  const { id } = req.params
  const { id: currentUserId } = req.user
  await offerService.deleteOffer(id, currentUserId)
  res.status(204).end()
}

module.exports = {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer
}
