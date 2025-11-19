// Event system for real-time updates across components

// Event types
export const PRODUCT_EVENTS = {
  PRODUCT_ADDED: 'product:added',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  STOCK_UPDATED: 'stock:updated',
  SALE_RECORDED: 'sale:recorded',
  DAMAGE_RECORDED: 'damage:recorded',
  RETURN_RECORDED: 'return:recorded'
};

// Simple event emitter
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(l => l !== listener);
    };
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Create singleton instance
export const productEvents = new EventEmitter();

// Helper functions to emit common events
export const emitProductAdded = (product) => {
  productEvents.emit(PRODUCT_EVENTS.PRODUCT_ADDED, product);
};

export const emitProductUpdated = (product) => {
  productEvents.emit(PRODUCT_EVENTS.PRODUCT_UPDATED, product);
};

export const emitProductDeleted = (productId) => {
  productEvents.emit(PRODUCT_EVENTS.PRODUCT_DELETED, productId);
};

export const emitStockUpdated = (product) => {
  productEvents.emit(PRODUCT_EVENTS.STOCK_UPDATED, product);
};

export const emitSaleRecorded = (product) => {
  productEvents.emit(PRODUCT_EVENTS.SALE_RECORDED, product);
};

export const emitDamageRecorded = (product) => {
  productEvents.emit(PRODUCT_EVENTS.DAMAGE_RECORDED, product);
};

export const emitReturnRecorded = (product) => {
  productEvents.emit(PRODUCT_EVENTS.RETURN_RECORDED, product);
};
