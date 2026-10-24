#!/usr/bin/env python3
"""
Gradescope Integration for Automated Grading

This script provides a complete workflow for:
1. Extracting submissions from Gradescope download ZIP
2. Grading with AI (GPT-4 Vision)
3. Converting results to Gradescope-compatible CSV for upload

Usage:
    python gradescope_integration.py
"""

import os
import json
import zipfile
import shutil
import csv
import re
from pathlib import Path
from enhanced_math_grader import EnhancedMathGrader
from dotenv import load_dotenv


class GradescopeIntegration:
    def __init__(self, api_key, max_workers=5):
        self.grader = EnhancedMathGrader(api_key=api_key, max_workers=max_workers)
        self.temp_dir = Path("temp_gradescope_submissions")

    def extract_gradescope_zip(self, zip_path):
        """Extract Gradescope submissions ZIP file"""
        print(f"📦 Extracting {Path(zip_path).name}...")

        # Clean up existing temp directory
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)

        self.temp_dir.mkdir(exist_ok=True)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(self.temp_dir)

        print(f"✅ Extracted to {self.temp_dir}\n")
        return self.temp_dir

    def parse_gradescope_structure(self, extracted_dir):
        """Parse Gradescope folder structure and student metadata"""
        submissions = []

        print("📋 Parsing student submissions...")

        # Gradescope creates folders like: studentname_studentid_assignsubmission_file/
        for student_folder in extracted_dir.iterdir():
            if not student_folder.is_dir():
                continue

            # Look for submission metadata
            metadata_file = student_folder / "submission_metadata.json"

            student_info = {
                'folder': student_folder,
                'name': 'Unknown',
                'email': '',
                'sid': '',
                'submission_file': None
            }

            # Parse metadata if exists
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)

                    # Extract student info from metadata
                    if ':submitters' in metadata:
                        submitters = metadata[':submitters']
                        if submitters and len(submitters) > 0:
                            student = submitters[0]
                            student_info['name'] = student.get(':name', 'Unknown')
                            student_info['email'] = student.get(':email', '')
                            student_info['sid'] = student.get(':sid', '')

            # If no metadata, try to extract from folder name
            if student_info['name'] == 'Unknown':
                folder_name = student_folder.name
                # Try to extract name from folder (format: name_id_...)
                parts = folder_name.split('_')
                if len(parts) > 0:
                    student_info['name'] = parts[0].replace('_', ' ')

            # Find the submission file (PDF)
            pdf_files = list(student_folder.glob('*.pdf'))
            if pdf_files:
                student_info['submission_file'] = pdf_files[0]
            else:
                # Try common names
                for filename in ['submission.pdf', 'homework.pdf', 'hw.pdf']:
                    potential_file = student_folder / filename
                    if potential_file.exists():
                        student_info['submission_file'] = potential_file
                        break

            if student_info['submission_file']:
                submissions.append(student_info)
                print(f"  ✓ Found: {student_info['name']} - {student_info['submission_file'].name}")
            else:
                print(f"  ⚠️  No PDF found for: {student_info['name']}")

        print(f"\n📊 Total submissions found: {len(submissions)}\n")
        return submissions

    def grade_gradescope_submissions(self, submissions, rubric_path, answer_key_path, output_folder='results/gradescope_results'):
        """Grade all Gradescope submissions"""
        os.makedirs(output_folder, exist_ok=True)

        print(f"\n{'='*60}")
        print(f"🤖 STARTING AI GRADING")
        print(f"{'='*60}\n")

        results = []

        # Create a temporary submissions folder for the grader
        temp_submissions = Path(output_folder) / "temp_submissions"
        temp_submissions.mkdir(exist_ok=True)

        # Copy submissions to temp folder with clean names
        submission_mapping = {}
        for i, sub in enumerate(submissions):
            # Create a clean filename for processing
            clean_name = f"student_{i:03d}_{sub['name'].replace(' ', '_')}.pdf"
            dest_path = temp_submissions / clean_name
            shutil.copy2(sub['submission_file'], dest_path)
            submission_mapping[clean_name] = sub

        # Grade using the batch grader
        grading_results = self.grader.batch_grade_parallel(
            rubric_path=rubric_path,
            answer_key_path=answer_key_path,
            submissions_folder=str(temp_submissions),
            output_folder=output_folder,
            resume_from=f"{output_folder}/progress.json"
        )

        # Map results back to student info
        for filename, result in grading_results.items():
            student_info = submission_mapping.get(filename, {})

            # Extract score from grading result
            score = 0
            max_points = 100

            if result['success']:
                match = re.search(r'Overall Score[:\s]+(\d+)/(\d+)', result['result'])
                if match:
                    score = int(match.group(1))
                    max_points = int(match.group(2))

            results.append({
                'name': student_info.get('name', 'Unknown'),
                'email': student_info.get('email', ''),
                'sid': student_info.get('sid', ''),
                'score': score,
                'max_points': max_points,
                'feedback': result.get('result', result.get('error', 'Grading failed')),
                'success': result['success']
            })

        # Clean up temp submissions
        shutil.rmtree(temp_submissions)

        return results

    def generate_gradescope_csv(self, results, output_path='gradescope_upload.csv'):
        """Generate CSV file for Gradescope upload"""
        print(f"\n📄 Generating Gradescope upload CSV...")

        # Determine max points (should be consistent)
        max_points = results[0]['max_points'] if results else 100

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            # Gradescope expects these columns
            fieldnames = ['Name', 'Email', 'SID', 'Total Score', 'Max Points', 'Feedback']
            writer = csv.DictWriter(f, fieldnames=fieldnames)

            writer.writeheader()

            for result in results:
                writer.writerow({
                    'Name': result['name'],
                    'Email': result['email'],
                    'SID': result['sid'],
                    'Total Score': result['score'],
                    'Max Points': max_points,
                    'Feedback': result['feedback']
                })

        print(f"✅ CSV saved to: {output_path}")
        print(f"\n{'='*60}")
        print(f"📊 GRADING SUMMARY")
        print(f"{'='*60}")
        print(f"Total students: {len(results)}")
        print(f"Successfully graded: {sum(1 for r in results if r['success'])}")
        print(f"Failed: {sum(1 for r in results if not r['success'])}")

        if results:
            avg_score = sum(r['score'] for r in results) / len(results)
            print(f"Average score: {avg_score:.1f}/{max_points}")

        print(f"{'='*60}\n")

        return output_path

    def cleanup(self):
        """Remove temporary files"""
        if self.temp_dir.exists():
            print(f"🧹 Cleaning up temporary files...")
            shutil.rmtree(self.temp_dir)
            print(f"✅ Cleanup complete\n")


def main():
    print("\n" + "="*60)
    print("🎓 GRADESCOPE AI GRADING INTEGRATION")
    print("="*60 + "\n")

    # Load environment variables
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key or api_key == "your_actual_key_here":
        print("❌ ERROR: Please set your OpenAI API key in .env file")
        print("\nEdit .env and add:")
        print("OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx")
        return

    print("🔑 API key loaded successfully\n")

    # Configuration
    print("📝 CONFIGURATION")
    print("-" * 60)

    # Find Gradescope ZIP file
    zip_files = list(Path('.').glob('*submissions*.zip'))
    if not zip_files:
        print("❌ No Gradescope submissions ZIP found!")
        print("\nPlease download submissions from Gradescope:")
        print("  1. Go to assignment → Review Grades")
        print("  2. Click 'Download Submissions'")
        print("  3. Save ZIP file in this directory")
        return

    zip_path = zip_files[0]
    print(f"Gradescope ZIP: {zip_path.name}")

    # Get homework assignment info
    hw_num = input("\nEnter homework number (e.g., 5): ").strip()

    rubric_path = f"assignments/hw{hw_num}/hw{hw_num}_rubric.txt"
    answer_key_path = f"assignments/hw{hw_num}/hw{hw_num}_solution.pdf"

    # Verify files exist
    if not Path(rubric_path).exists():
        print(f"❌ Rubric not found: {rubric_path}")
        print(f"\nPlease add rubric file to: {rubric_path}")
        return

    if not Path(answer_key_path).exists():
        print(f"❌ Answer key not found: {answer_key_path}")
        print(f"\nPlease add answer key PDF to: {answer_key_path}")
        return

    print(f"Rubric: {rubric_path}")
    print(f"Answer Key: {answer_key_path}")
    print(f"Output: gradescope_upload.csv")
    print("-" * 60)

    # Ask for confirmation
    response = input("\nStart grading? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled")
        return

    # Initialize integration
    integration = GradescopeIntegration(api_key=api_key, max_workers=5)

    try:
        # Step 1: Extract ZIP
        extracted_dir = integration.extract_gradescope_zip(zip_path)

        # Step 2: Parse submissions
        submissions = integration.parse_gradescope_structure(extracted_dir)

        if not submissions:
            print("❌ No valid submissions found!")
            return

        # Step 3: Grade submissions
        results = integration.grade_gradescope_submissions(
            submissions=submissions,
            rubric_path=rubric_path,
            answer_key_path=answer_key_path,
            output_folder=f"results/hw{hw_num}_gradescope"
        )

        # Step 4: Generate Gradescope CSV
        csv_path = integration.generate_gradescope_csv(
            results=results,
            output_path=f"hw{hw_num}_gradescope_upload.csv"
        )

        print("\n✅ COMPLETE! Next steps:")
        print("-" * 60)
        print(f"1. Review the generated CSV: {csv_path}")
        print("2. Go to Gradescope → Assignment → Review Grades")
        print("3. Click 'Upload Grades' (bottom right)")
        print(f"4. Select {csv_path}")
        print("5. Map columns if needed and confirm upload")
        print("-" * 60)
        print("\n🎉 Done!\n")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Cleanup
        integration.cleanup()


if __name__ == "__main__":
    main()
