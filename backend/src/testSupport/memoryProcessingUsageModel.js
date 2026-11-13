function copy(value) {
  return value ? structuredClone(value) : null
}

export function createMemoryProcessingUsageModel() {
  const sessions = new Map()
  return {
    async updateOne(filter, update, options = {}) {
      let session = sessions.get(filter.sessionId)
      if (!session && options.upsert) {
        session = {
          sessionId: filter.sessionId,
          images: [],
          ...update.$setOnInsert,
        }
        sessions.set(filter.sessionId, session)
        return { matchedCount: 0 }
      }
      if (!session) return { matchedCount: 0 }

      if (update.$pull?.images) {
        const criteria = update.$pull.images
        session.images = session.images.filter(
          (image) =>
            image.originalPublicId !== criteria.originalPublicId ||
            image.reservationId !== criteria.reservationId ||
            image.status !== criteria.status,
        )
        return { matchedCount: 1 }
      }

      const elementMatch = filter.images?.$elemMatch
      if (elementMatch) {
        const image = session.images.find(
          (entry) =>
            entry.originalPublicId === elementMatch.originalPublicId &&
            entry.reservationId === elementMatch.reservationId &&
            entry.status === elementMatch.status,
        )
        if (!image) return { matchedCount: 0 }
        Object.assign(image, {
          status: update.$set["images.$.status"],
        })
        delete image.reservationId
        return { matchedCount: 1 }
      }
      return { matchedCount: 1 }
    },
    findOne(filter) {
      const session = sessions.get(filter.sessionId)
      const publicId = filter["images.originalPublicId"]
      const matches =
        session &&
        (!publicId ||
          session.images.some((image) => image.originalPublicId === publicId))
      return { lean: () => Promise.resolve(matches ? copy(session) : null) }
    },
    findOneAndUpdate(filter, update) {
      const session = sessions.get(filter.sessionId)
      const publicId = filter["images.originalPublicId"].$ne
      const canAdd =
        session &&
        session.images.length < 2 &&
        !session.images.some((image) => image.originalPublicId === publicId)
      if (canAdd) session.images.push(update.$push.images)
      return { lean: () => Promise.resolve(canAdd ? copy(session) : null) }
    },
  }
}
