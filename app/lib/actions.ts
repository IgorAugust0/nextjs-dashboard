'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Validating the types with Zod
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

// ommit specific types from schema
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0]; // e.g.: "2023-04-05"

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date) 
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
  } catch (error) {
    return { message: 'DATABASE ERROR: failed to CREATE invoice' };
  }

  revalidatePath('/dashboard/invoices'); //  clear the client cache and make a new server request
  redirect('/dashboard/invoices'); // redirect the user to the invoice's page
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
      `;
  } catch (error) {
    return { message: 'DATABASE ERROR: failed to UPDATE invoice' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    // no need for redirect since action is in the /dashboard/invoices path
    return { message: 'Invoice deleted.' };
  } catch (error) {
    return { message: 'DATABASE ERROR: failed to DELETE invoice' };
  }
}
