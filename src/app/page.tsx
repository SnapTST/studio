'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  BookText,
  FileImage,
  Loader2,
  Save,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';

import { generateTestPaper } from '@/ai/flows/generate-test-paper';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export default function Home() {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [marks, setMarks] = useState('10');
  const [generatedTest, setGeneratedTest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation for image type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload an image file (e.g., PNG, JPG, WEBP).',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateTest = async () => {
    if (!imageFile) {
      toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please upload an image to generate a test paper.',
      });
      return;
    }
    
    if (!marks || parseInt(marks, 10) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Marks',
        description: 'Please enter a valid number for total marks.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedTest(null);

    try {
      const photoDataUri = await toBase64(imageFile);
      const result = await generateTestPaper({
        photoDataUri,
        marks: parseInt(marks, 10),
      });
      setGeneratedTest(result.testPaper);
      toast({
        title: 'Success!',
        description: 'Your test paper has been generated.',
      });
    } catch (error) {
      console.error('Error generating test paper:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description:
          'Something went wrong. Please try again with a clearer image.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLocally = () => {
    if (!generatedTest) return;
    try {
      localStorage.setItem(`snaptest-${Date.now()}`, generatedTest);
      toast({
        title: 'Saved Locally',
        description:
          "The test paper has been saved in your browser's local storage.",
      });
    } catch (error) {
      console.error('Error saving to local storage:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description:
          'Could not save the test paper. Your browser storage might be full.',
      });
    }
  };

  const handlePrint = () => {
    if (!generatedTest) return;
    window.print();
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-center gap-2 p-4 border-b">
        <Layers className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-headline font-bold text-center">
          SnapTest AI Paper Generator
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <BookText />
                1. Create Your Test
              </CardTitle>
              <CardDescription>
                Upload a textbook page and select the total marks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image-upload" className="font-bold">
                  Upload Image
                </Label>
                <div
                  className="relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Selected preview"
                      layout="fill"
                      objectFit="contain"
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileImage className="mx-auto h-12 w-12" />
                      <p>Click to upload or drag and drop</p>
                      <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marks-input" className="font-bold">Total Marks</Label>
                <Input
                  id="marks-input"
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="E.g. 25"
                  min="1"
                  className="w-full max-w-xs"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerateTest}
                disabled={!imageFile || isLoading}
                className="w-full font-bold"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generating...' : 'Generate Test Paper'}
              </Button>
            </CardFooter>
          </Card>

          {/* Output Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                2. Generated Test Paper
              </CardTitle>
              <CardDescription>
                Preview your test below. You can save it or export to PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-12 w-full mt-4" />
                  <Skeleton className="h-6 w-1/2 mt-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              {generatedTest && (
                <div
                  id="printable-area"
                  className="prose dark:prose-invert max-w-none rounded-md border bg-secondary/30 p-4 h-96 overflow-y-auto"
                >
                  <pre className="font-body whitespace-pre-wrap text-sm">
                    {generatedTest}
                  </pre>
                </div>
              )}
              {!isLoading && !generatedTest && (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                  <p>Your generated test will appear here.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleSaveLocally}
                disabled={!generatedTest || isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Locally
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!generatedTest || isLoading}
              >
                <Printer className="mr-2 h-4 w-4" />
                Export to PDF
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <div className="fixed bottom-0 left-0 w-full bg-card/80 backdrop-blur-sm p-2 text-center text-xs text-muted-foreground border-t">
        Ad Banner Placeholder
      </div>
    </div>
  );
}
