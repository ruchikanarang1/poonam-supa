import { supabase } from './supabase.js';

/**
 * Valid order status values in the lifecycle
 */
const ORDER_STATUSES = {
  RECEIVED: 'received',
  SENT: 'sent',
  PAYMENT_RECEIVED: 'payment_received'
};

/**
 * Valid status transitions in the order lifecycle
 * Format: { currentStatus: [allowedNextStatuses] }
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUSES.RECEIVED]: [ORDER_STATUSES.SENT],
  [ORDER_STATUSES.SENT]: [ORDER_STATUSES.PAYMENT_RECEIVED],
  [ORDER_STATUSES.PAYMENT_RECEIVED]: [] // Final state - no transitions allowed
};

/**
 * Validates if a status transition is allowed in the order lifecycle
 * 
 * @param {string} currentStatus - The current order status
 * @param {string} newStatus - The desired new status
 * @returns {boolean} True if transition is valid, false otherwise
 * 
 * @example
 * validateStatusTransition('received', 'sent') // returns true
 * validateStatusTransition('received', 'payment_received') // returns false (skips stage)
 * validateStatusTransition('sent', 'received') // returns false (backward transition)
 */
export function validateStatusTransition(currentStatus, newStatus) {
  // Check if current status exists in valid transitions
  if (!VALID_TRANSITIONS.hasOwnProperty(currentStatus)) {
    return false;
  }

  // Check if new status is in the allowed transitions for current status
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Updates an order's status with validation and history tracking
 * 
 * @param {string} orderId - The UUID of the order to update
 * @param {string} newStatus - The new status to set
 * @param {string} userId - The UUID of the user making the change
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await updateOrderStatus('order-uuid', 'sent', 'user-uuid');
 * if (result.success) {
 *   console.log('Order updated:', result.data);
 * } else {
 *   console.error('Update failed:', result.error);
 * }
 */
export async function updateOrderStatus(orderId, newStatus, userId) {
  try {
    // Validate inputs
    if (!orderId || !newStatus || !userId) {
      return {
        success: false,
        error: 'Missing required parameters: orderId, newStatus, and userId are required'
      };
    }

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, status_history')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch order: ${fetchError.message}`
      };
    }

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Validate status transition
    if (!validateStatusTransition(order.status, newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from "${order.status}" to "${newStatus}". Valid transitions: ${VALID_TRANSITIONS[order.status]?.join(', ') || 'none (final state)'}`
      };
    }

    // Get user profile for history entry
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'Unknown User';

    // Create new history entry
    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      user_id: userId,
      user_name: userName
    };

    // Append to status history
    const updatedHistory = [...(order.status_history || []), historyEntry];

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        status_history: updatedHistory
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to update order: ${updateError.message}`
      };
    }

    return {
      success: true,
      data: updatedOrder
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Adds a note to an order
 * 
 * @param {string} orderId - The UUID of the order
 * @param {string} noteText - The text content of the note
 * @param {string} userId - The UUID of the user adding the note
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await addOrderNote('order-uuid', 'Customer requested express delivery', 'user-uuid');
 */
export async function addOrderNote(orderId, noteText, userId) {
  try {
    // Validate inputs
    if (!orderId || !noteText || !userId) {
      return {
        success: false,
        error: 'Missing required parameters: orderId, noteText, and userId are required'
      };
    }

    if (noteText.trim().length === 0) {
      return {
        success: false,
        error: 'Note text cannot be empty'
      };
    }

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, notes')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch order: ${fetchError.message}`
      };
    }

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'Unknown User';

    // Create new note
    const newNote = {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      author_id: userId,
      author_name: userName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Append to notes array
    const updatedNotes = [...(order.notes || []), newNote];

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to add note: ${updateError.message}`
      };
    }

    return {
      success: true,
      data: { order: updatedOrder, note: newNote }
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Edits an existing order note
 * 
 * @param {string} orderId - The UUID of the order
 * @param {string} noteId - The UUID of the note to edit
 * @param {string} newText - The new text content for the note
 * @param {string} userId - The UUID of the user editing the note
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await editOrderNote('order-uuid', 'note-uuid', 'Updated note text', 'user-uuid');
 */
export async function editOrderNote(orderId, noteId, newText, userId) {
  try {
    // Validate inputs
    if (!orderId || !noteId || !newText || !userId) {
      return {
        success: false,
        error: 'Missing required parameters: orderId, noteId, newText, and userId are required'
      };
    }

    if (newText.trim().length === 0) {
      return {
        success: false,
        error: 'Note text cannot be empty'
      };
    }

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, notes')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch order: ${fetchError.message}`
      };
    }

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Find the note to edit
    const notes = order.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    // Check if user is the author
    if (notes[noteIndex].author_id !== userId) {
      return {
        success: false,
        error: 'You can only edit your own notes'
      };
    }

    // Update the note
    const updatedNotes = [...notes];
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      text: newText.trim(),
      updated_at: new Date().toISOString()
    };

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to edit note: ${updateError.message}`
      };
    }

    return {
      success: true,
      data: { order: updatedOrder, note: updatedNotes[noteIndex] }
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Deletes an order note
 * 
 * @param {string} orderId - The UUID of the order
 * @param {string} noteId - The UUID of the note to delete
 * @param {string} userId - The UUID of the user deleting the note
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await deleteOrderNote('order-uuid', 'note-uuid', 'user-uuid');
 */
export async function deleteOrderNote(orderId, noteId, userId) {
  try {
    // Validate inputs
    if (!orderId || !noteId || !userId) {
      return {
        success: false,
        error: 'Missing required parameters: orderId, noteId, and userId are required'
      };
    }

    // Get current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, notes')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch order: ${fetchError.message}`
      };
    }

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Find the note to delete
    const notes = order.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    // Check if user is the author
    if (notes[noteIndex].author_id !== userId) {
      return {
        success: false,
        error: 'You can only delete your own notes'
      };
    }

    // Remove the note
    const updatedNotes = notes.filter(note => note.id !== noteId);

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ notes: updatedNotes })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to delete note: ${updateError.message}`
      };
    }

    return {
      success: true,
      data: { order: updatedOrder }
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Links a transport entry to an order
 * 
 * @param {string} orderId - The UUID of the order
 * @param {string} transportId - The UUID of the transport entry to link
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await linkTransport('order-uuid', 'transport-uuid');
 */
export async function linkTransport(orderId, transportId) {
  try {
    // Validate inputs
    if (!orderId || !transportId) {
      return {
        success: false,
        error: 'Missing required parameters: orderId and transportId are required'
      };
    }

    // Verify transport entry exists
    const { data: transport, error: transportError } = await supabase
      .from('logistics_transport')
      .select('id')
      .eq('id', transportId)
      .single();

    if (transportError || !transport) {
      return {
        success: false,
        error: 'Transport entry not found'
      };
    }

    // Update order with transport link
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ transport_id: transportId })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to link transport: ${updateError.message}`
      };
    }

    if (!updatedOrder) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    return {
      success: true,
      data: updatedOrder
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Gets complete order details including transport information
 * 
 * @param {string} orderId - The UUID of the order
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await getOrderDetails('order-uuid');
 * if (result.success) {
 *   console.log('Order:', result.data);
 * }
 */
export async function getOrderDetails(orderId) {
  try {
    // Validate input
    if (!orderId) {
      return {
        success: false,
        error: 'Missing required parameter: orderId is required'
      };
    }

    // Fetch order with transport details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        transport:logistics_transport(
          id,
          lr_number,
          transport_company,
          vehicle_number,
          driver_name,
          driver_phone,
          departure_date,
          expected_arrival_date,
          actual_arrival_date,
          status
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch order: ${fetchError.message}`
      };
    }

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    return {
      success: true,
      data: order
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

// Export constants for use in components
export { ORDER_STATUSES, VALID_TRANSITIONS };

/**
 * Generates a PDF invoice for an order
 * 
 * @param {object} order - The order object with items, customer info, and totals
 * @param {object} company - The company object with name and contact info
 * @returns {Promise<{success: boolean, error?: string}>}
 * 
 * @example
 * const result = await generateInvoice(order, company);
 * if (result.success) {
 *   console.log('Invoice generated and downloaded');
 * }
 */
export async function generateInvoice(order, company) {
  try {
    // Dynamically import jsPDF to avoid SSR issues
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    // Company details
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(company?.name || 'Company Name', 20, 35);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    if (company?.location) {
      doc.text(company.location, 20, 42);
    }
    
    // Invoice details (right side)
    doc.setFontSize(10);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 140, 35);
    doc.text(`Order ID: ${order.id.substring(0, 8)}`, 140, 42);
    
    // Customer details
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 20, 55);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(order.customer_name || 'Customer', 20, 62);
    if (order.customer_phone) {
      doc.text(`Phone: ${order.customer_phone}`, 20, 69);
    }
    if (order.customer_email) {
      doc.text(`Email: ${order.customer_email}`, 20, 76);
    }
    if (order.customer_address) {
      const addressLines = doc.splitTextToSize(order.customer_address, 80);
      doc.text(addressLines, 20, 83);
    }
    
    // Items table
    const tableStartY = order.customer_address ? 100 : 90;
    
    const tableData = (order.items || []).map(item => [
      item.name || 'Item',
      item.quantity || 1,
      item.unit || 'pcs',
      `₹${(item.price || 0).toFixed(2)}`,
      `₹${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: tableStartY,
      head: [['Item', 'Quantity', 'Unit', 'Price', 'Total']],
      body: tableData,
      foot: [['', '', '', 'Grand Total:', `₹${(order.total || 0).toFixed(2)}`]],
      theme: 'striped',
      headStyles: { fillColor: [255, 106, 0], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', 105, finalY, { align: 'center' });
    
    // Update invoice_generated_at timestamp in database
    await supabase
      .from('orders')
      .update({ invoice_generated_at: new Date().toISOString() })
      .eq('id', order.id);
    
    // Save/download the PDF
    doc.save(`invoice-${order.id.substring(0, 8)}-${Date.now()}.pdf`);
    
    return { success: true };
  } catch (error) {
    console.error('Invoice generation error:', error);
    return {
      success: false,
      error: `Failed to generate invoice: ${error.message}`
    };
  }
}

/**
 * Sends a notification to the customer about order status update
 * 
 * @param {string} orderId - The UUID of the order
 * @param {string} notificationType - Type of notification ('status_update', 'order_received', etc.)
 * @param {string} channel - Notification channel ('email' or 'sms')
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * @example
 * const result = await sendNotification('order-uuid', 'status_update', 'email');
 */
export async function sendNotification(orderId, notificationType, channel) {
  try {
    // Validate inputs
    if (!orderId || !notificationType || !channel) {
      return {
        success: false,
        error: 'Missing required parameters: orderId, notificationType, and channel are required'
      };
    }

    // Get order details
    const orderResult = await getOrderDetails(orderId);
    if (!orderResult.success) {
      return {
        success: false,
        error: 'Failed to fetch order details for notification'
      };
    }

    const order = orderResult.data;

    // Generate notification content
    const content = generateNotificationContent(order, notificationType);

    // Send notification based on channel
    if (channel === 'email' && order.customer_email) {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log('📧 Email notification:', {
        to: order.customer_email,
        subject: content.subject,
        body: content.body
      });
      
      // Placeholder for actual email service integration
      // await emailService.send({
      //   to: order.customer_email,
      //   subject: content.subject,
      //   html: content.body
      // });
      
      return {
        success: true,
        data: {
          channel: 'email',
          recipient: order.customer_email,
          message: 'Email notification sent (placeholder - configure email service)'
        }
      };
    }

    if (channel === 'sms' && order.customer_phone) {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log('📱 SMS notification:', {
        to: order.customer_phone,
        message: content.sms
      });
      
      // Placeholder for actual SMS service integration
      // await smsService.send({
      //   to: order.customer_phone,
      //   message: content.sms
      // });
      
      return {
        success: true,
        data: {
          channel: 'sms',
          recipient: order.customer_phone,
          message: 'SMS notification sent (placeholder - configure SMS service)'
        }
      };
    }

    return {
      success: false,
      error: `No ${channel} contact information available for customer`
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send notification: ${error.message}`
    };
  }
}

/**
 * Generates notification content based on order and notification type
 * 
 * @param {object} order - The order object
 * @param {string} notificationType - Type of notification
 * @returns {object} Notification content with subject, body, and sms
 * @private
 */
function generateNotificationContent(order, notificationType) {
  const orderId = order.id.substring(0, 8);
  const statusDisplay = {
    'received': 'Received',
    'sent': 'Dispatched',
    'payment_received': 'Completed'
  };

  switch (notificationType) {
    case 'status_update':
      return {
        subject: `Order ${orderId} - Status Update`,
        body: `
          <h2>Order Status Update</h2>
          <p>Dear ${order.customer_name},</p>
          <p>Your order <strong>#${orderId}</strong> status has been updated to: <strong>${statusDisplay[order.status] || order.status}</strong></p>
          <p>Order Total: ₹${order.total}</p>
          <p>Thank you for your business!</p>
        `,
        sms: `Order #${orderId} status updated to: ${statusDisplay[order.status] || order.status}. Total: ₹${order.total}`
      };

    case 'order_received':
      return {
        subject: `Order ${orderId} - Confirmation`,
        body: `
          <h2>Order Received</h2>
          <p>Dear ${order.customer_name},</p>
          <p>We have received your order <strong>#${orderId}</strong>.</p>
          <p>Order Total: ₹${order.total}</p>
          <p>We will process it shortly and keep you updated.</p>
        `,
        sms: `Order #${orderId} received. Total: ₹${order.total}. We will process it shortly.`
      };

    case 'order_dispatched':
      return {
        subject: `Order ${orderId} - Dispatched`,
        body: `
          <h2>Order Dispatched</h2>
          <p>Dear ${order.customer_name},</p>
          <p>Your order <strong>#${orderId}</strong> has been dispatched and is on its way!</p>
          <p>Order Total: ₹${order.total}</p>
          ${order.transport ? `<p>Transport: ${order.transport.transport_company} - LR: ${order.transport.lr_number}</p>` : ''}
        `,
        sms: `Order #${orderId} dispatched! ${order.transport ? `LR: ${order.transport.lr_number}` : 'On its way to you.'}`
      };

    default:
      return {
        subject: `Order ${orderId} - Update`,
        body: `
          <p>Dear ${order.customer_name},</p>
          <p>Your order <strong>#${orderId}</strong> has been updated.</p>
          <p>Order Total: ₹${order.total}</p>
        `,
        sms: `Order #${orderId} updated. Total: ₹${order.total}`
      };
  }
}
