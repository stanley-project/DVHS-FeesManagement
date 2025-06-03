import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVillages } from '@/hooks/useVillages';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  villageId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  feeAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Fee amount must be a positive number',
  }),
  effectiveFromDate: z.string().min(1, 'Effective from date is required'),
  effectiveToDate: z.string().min(1, 'Effective to date is required'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BusFeeForm = () => {
  const { toast } = useToast();
  const { villages } = useVillages();
  const { academicYears } = useAcademicYears();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Convert string amount to number for database
      const formattedData = {
        ...data,
        feeAmount: parseFloat(data.feeAmount),
      };

      console.log('Submitting bus fee:', formattedData);
      
      // TODO: Implement actual submission logic using Supabase
      
      toast({
        title: 'Success',
        description: 'Bus fee structure has been updated successfully.',
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting bus fee:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bus fee structure. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bus Fee Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="villageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Village</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a village" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {villages?.map((village) => (
                        <SelectItem key={village.id} value={village.id}>
                          {village.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="academicYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {academicYears?.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.year_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feeAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter fee amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveFromDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective From</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveToDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective To</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Add any additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Bus Fee Structure'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BusFeeForm;