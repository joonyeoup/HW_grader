import os
import json
import base64
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from openai import OpenAI
from typing import List, Dict
import threading

class EnhancedMathGrader:
    def __init__(self, api_key, max_workers=5):
        self.client = OpenAI(api_key=api_key)
        self.max_workers = max_workers
        self.progress_lock = threading.Lock()
        self.progress = {}
        
    def encode_image(self, image_path):
        """Convert image to base64"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    def extract_pdf_pages_as_images(self, pdf_path):
        """Convert PDF to PNG images"""
        from pdf2image import convert_from_path
        from PIL import Image
        
        try:
            print(f"📄 Converting PDF: {Path(pdf_path).name}")
            
            images = convert_from_path(
                pdf_path,
                dpi=200,
                fmt='png',
                thread_count=2
            )
            
            image_paths = []
            
            for i, image in enumerate(images):
                img_path = f"temp_{Path(pdf_path).stem}_page_{i}.png"
                
                if image.mode not in ('RGB', 'L'):
                    image = image.convert('RGB')
                
                image.save(img_path, 'PNG', optimize=True, quality=85)
                
                if not os.path.exists(img_path):
                    raise Exception(f"Failed to create {img_path}")
                
                with Image.open(img_path) as img:
                    if img.format != 'PNG':
                        img.save(img_path, 'PNG')
                
                image_paths.append(img_path)
                print(f"  ✓ Page {i+1}/{len(images)} converted")
            
            print(f"✅ Converted {len(images)} pages to PNG\n")
            return image_paths
            
        except Exception as e:
            print(f"❌ Error converting PDF: {e}")
            raise
    
    def grade_single_submission(self, rubric_path, answer_key_path, 
                               submission_path, student_name=None):
        """Grade a single submission"""
        try:
            print(f"Processing {Path(submission_path).name}...")
            
            # Process inputs (handles .txt, .pdf, and images)
            rubric_content = self._process_input(rubric_path)
            answer_images = self._process_input(answer_key_path)
            student_images = self._process_input(submission_path)
            
            # rubric_content is either text string or list of image paths
            if isinstance(rubric_content, str):
                print(f"  Rubric: Text file loaded")
            else:
                print(f"  Rubric: {len(rubric_content)} pages")
            
            print(f"  Answer key: {len(answer_images)} pages")
            print(f"  Submission: {len(student_images)} pages")
            
            messages = self._build_grading_prompt(
                rubric_content, answer_images, student_images, student_name
            )
            
            print(f"  Sending to GPT-4 Vision...")
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=4000,
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            self._cleanup_temp_files(submission_path)
            
            print(f"  ✅ Grading complete!\n")
            
            return {
                'success': True,
                'result': result,
                'student': student_name or Path(submission_path).stem,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"  ❌ Error: {e}\n")
            return {
                'success': False,
                'error': str(e),
                'student': student_name or Path(submission_path).stem,
                'timestamp': datetime.now().isoformat()
            }
    
    def batch_grade_parallel(self, rubric_path, answer_key_path, 
                            submissions_folder, output_folder='results',
                            resume_from=None):
        """Grade multiple submissions in parallel"""
        os.makedirs(output_folder, exist_ok=True)
        
        submission_files = list(Path(submissions_folder).glob('*'))
        submission_files = [f for f in submission_files if f.suffix.lower() in 
                          ['.pdf', '.jpg', '.jpeg', '.png']]
        
        total_submissions = len(submission_files)
        
        completed = {}
        if resume_from and os.path.exists(resume_from):
            with open(resume_from, 'r') as f:
                completed = json.load(f)
            print(f"📂 Resuming: Found {len(completed)} already graded")
        
        remaining = [f for f in submission_files if f.name not in completed]
        
        if not remaining:
            print("✅ All submissions already graded!")
            return completed
        
        print(f"\n{'='*60}")
        print(f"📚 BATCH GRADING SESSION")
        print(f"{'='*60}")
        print(f"Total submissions: {total_submissions}")
        print(f"Already completed: {len(completed)}")
        print(f"Remaining: {len(remaining)}")
        print(f"Parallel workers: {self.max_workers}")
        print(f"{'='*60}\n")
        
        self.progress = {
            'total': len(remaining),
            'completed': 0,
            'failed': 0,
            'in_progress': 0
        }
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_file = {
                executor.submit(
                    self.grade_single_submission,
                    rubric_path,
                    answer_key_path,
                    str(submission_file),
                    submission_file.stem
                ): submission_file
                for submission_file in remaining
            }
            
            for future in as_completed(future_to_file):
                submission_file = future_to_file[future]
                
                try:
                    result = future.result()
                    completed[submission_file.name] = result
                    
                    with self.progress_lock:
                        if result['success']:
                            self.progress['completed'] += 1
                            status = "✅"
                        else:
                            self.progress['failed'] += 1
                            status = "❌"
                        
                        progress_pct = (self.progress['completed'] + 
                                      self.progress['failed']) / self.progress['total'] * 100
                        print(f"{status} [{progress_pct:.1f}%] {submission_file.name} "
                              f"({self.progress['completed']}/{self.progress['total']} completed)")
                    
                    self._save_results(completed, output_folder)
                    
                except Exception as e:
                    print(f"❌ Error processing {submission_file.name}: {e}")
                    with self.progress_lock:
                        self.progress['failed'] += 1
        
        elapsed_time = time.time() - start_time
        
        print(f"\n{'='*60}")
        print(f"📊 GRADING COMPLETE")
        print(f"{'='*60}")
        print(f"✅ Successfully graded: {self.progress['completed']}")
        print(f"❌ Failed: {self.progress['failed']}")
        print(f"⏱️  Total time: {elapsed_time/60:.1f} minutes")
        print(f"⚡ Average time per submission: {elapsed_time/len(remaining):.1f} seconds")
        print(f"{'='*60}\n")
        
        return completed
    
    def _save_results(self, results, output_folder):
        """Save results to files"""
        json_path = Path(output_folder) / 'progress.json'
        with open(json_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        report_path = Path(output_folder) / 'grading_report.txt'
        with open(report_path, 'w') as f:
            f.write("GRADING REPORT\n")
            f.write("="*60 + "\n\n")
            
            for filename, result in results.items():
                f.write(f"\n{'='*60}\n")
                f.write(f"STUDENT: {filename}\n")
                f.write(f"{'='*60}\n")
                
                if result['success']:
                    f.write(result['result'])
                else:
                    f.write(f"ERROR: {result['error']}")
                
                f.write("\n\n")
        
        import csv
        csv_path = Path(output_folder) / 'grades_summary.csv'
        
        with open(csv_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Student', 'Score', 'Status', 'Timestamp'])
            
            for filename, result in results.items():
                student_name = Path(filename).stem
                status = 'Success' if result['success'] else 'Failed'
                
                score = 'N/A'
                if result['success']:
                    import re
                    match = re.search(r'Overall Score[:\s]+(\d+)/(\d+)', result['result'])
                    if match:
                        score = f"{match.group(1)}/{match.group(2)}"
                
                writer.writerow([
                    student_name,
                    score,
                    status,
                    result.get('timestamp', '')
                ])
    
    def _process_input(self, file_path):
        """Process input file - supports .txt, .pdf, and images"""
        file_str = str(file_path).lower()
        
        # Handle text files
        if file_str.endswith('.txt'):
            print(f"📝 Reading text file: {Path(file_path).name}")
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f"✅ Loaded text rubric ({len(content)} characters)\n")
            return content  # Return as string, not list
        
        # Handle PDFs
        elif file_str.endswith('.pdf'):
            return self.extract_pdf_pages_as_images(file_path)
        
        # Handle images
        elif file_str.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            return [file_path]
        
        else:
            raise ValueError(f"Unsupported file format: {file_path}\nSupported: .txt, .pdf, .png, .jpg, .jpeg, .gif, .webp")
    
    def _build_grading_prompt(self, rubric_content, answer_imgs, 
                              student_imgs, student_name=None):
        """Build the grading prompt - handles both text and image rubrics"""
        student_prefix = f" for {student_name}" if student_name else ""
        
        messages = [
            {
                "role": "system",
                "content": """You are an expert mathematics instructor grading homework.

Provide:
1. **Overall Score: XX/100** (on the VERY FIRST LINE)
2. Question-by-question breakdown with points
3. Specific feedback on errors and correct work
4. Partial credit for correct methodology

Be fair, consistent, and constructive."""
            }
        ]
        
        content = []
        
        # Add rubric - either as text or images
        if isinstance(rubric_content, str):
            # Text rubric
            content.append({
                "type": "text",
                "text": f"**GRADING RUBRIC:**\n\n{rubric_content}"
            })
        else:
            # Image rubric
            content.append({"type": "text", "text": "**GRADING RUBRIC:**"})
            for img_path in rubric_content:
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{self.encode_image(img_path)}"
                    }
                })
        
        # Add answer key
        content.append({"type": "text", "text": "\n**ANSWER KEY:**"})
        for img_path in answer_imgs:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{self.encode_image(img_path)}"
                }
            })
        
        # Add student submission
        content.append({
            "type": "text", 
            "text": f"\n**STUDENT SUBMISSION{student_prefix.upper()}:**"
        })
        for img_path in student_imgs:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{self.encode_image(img_path)}"
                }
            })
        
        content.append({
            "type": "text",
            "text": "\n\nGrade this submission according to the rubric. Start your response with 'Overall Score: XX/100' on the first line."
        })
        
        messages.append({"role": "user", "content": content})
        return messages
    
    def _cleanup_temp_files(self, submission_path):
        """Clean up temporary image files"""
        stem = Path(submission_path).stem
        for f in Path('.').glob(f'temp_{stem}_*.png'):
            try:
                f.unlink()
            except:
                pass
