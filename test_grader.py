#!/usr/bin/env python3
"""
Simple test script to grade homework
"""
import os
from pathlib import Path
from enhanced_math_grader import EnhancedMathGrader
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_actual_key_here":
        print("❌ ERROR: Please set your OpenAI API key in .env file")
        print("\nEdit .env and add:")
        print("OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx")
        return
    
    print("🔑 API key loaded successfully\n")
    
    # Check for homework files
    hw_folder = "assignments/hw5"
    rubric = f"{hw_folder}/hw5_rubric.txt"
    answer_key = f"{hw_folder}/hw5_solution.pdf"
    submissions = f"{hw_folder}/submissions"
    
    # Verify files exist
    if not Path(rubric).exists():
        print(f"❌ Rubric not found: {rubric}")
        print("\n📝 Please add your homework assignment PDF to:")
        print(f"   {rubric}")
        return
    
    if not Path(answer_key).exists():
        print(f"❌ Answer key not found: {answer_key}")
        print("\n📝 Please add your answer key PDF to:")
        print(f"   {answer_key}")
        return
    
    if not Path(submissions).exists():
        print(f"❌ Submissions folder not found: {submissions}")
        print("\n📝 Please create folder and add student PDFs:")
        print(f"   {submissions}/")
        return
    
    # Count submissions
    submission_files = list(Path(submissions).glob('*.pdf'))
    if not submission_files:
        print(f"❌ No PDF submissions found in: {submissions}")
        print("\n📝 Please add student homework PDFs to:")
        print(f"   {submissions}/student1.pdf")
        print(f"   {submissions}/student2.pdf")
        return
    
    print(f"✅ Found all required files!\n")
    print(f"{'='*60}")
    print(f"📚 GRADING CONFIGURATION")
    print(f"{'='*60}")
    print(f"Rubric: {rubric}")
    print(f"Answer Key: {answer_key}")
    print(f"Submissions: {len(submission_files)} students")
    print(f"Output: results/hw5_results/")
    print(f"{'='*60}\n")
    
    # Ask for confirmation
    response = input("Start grading? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled")
        return
    
    # Initialize grader
    print("\n🤖 Initializing grader...\n")
    grader = EnhancedMathGrader(
        api_key=api_key,
        max_workers=3  # Start with 3 workers for testing
    )
    
    # Grade submissions
    output_folder = "results/hw6_results"
    
    results = grader.batch_grade_parallel(
        rubric_path=rubric,
        answer_key_path=answer_key,
        submissions_folder=submissions,
        output_folder=output_folder,
        resume_from=f"{output_folder}/progress.json"
    )
    
    print(f"\n✅ GRADING COMPLETE!\n")
    print(f"📊 Results saved to: {output_folder}/")
    print(f"   📄 grading_report.txt  - Full feedback for each student")
    print(f"   📊 grades_summary.csv  - Spreadsheet of all grades")
    print(f"   💾 progress.json       - Raw results data")
    print(f"\n🎉 Done! Check the results folder.\n")

if __name__ == "__main__":
    main()
