#!/usr/bin/env python3
"""
Enhanced hierarchy management for automatic work item organization
"""
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import json
from collections import defaultdict

def create_smart_categories():
    """Define smart categories for automatic work item organization"""
    return {
        'User Management & Authentication': {
            'description': 'User authentication, authorization, role management, and user account features',
            'keywords': ['user', 'auth', 'login', 'register', 'role', 'permission', 'account', 'profile', 'customer', 'b2b', 'b2c', 'b2g', 'group'],
            'priority': 'high',
            'item_types': ['epic', 'story']
        },
        'Product Catalog & Search': {
            'description': 'Product management, search functionality, filtering, categorization, and product discovery',
            'keywords': ['product', 'search', 'catalog', 'category', 'filter', 'variant', 'attribute', 'fuzzy', 'predictive', 'browse'],
            'priority': 'high',
            'item_types': ['epic', 'story']
        },
        'Pricing & Financial': {
            'description': 'Pricing display, calculations, discounts, taxes, and financial operations',
            'keywords': ['price', 'pricing', 'cost', 'discount', 'tax', 'gst', 'financial', 'payment', 'billing', 'invoice'],
            'priority': 'high',
            'item_types': ['epic', 'story']
        },
        'Inventory & Stock': {
            'description': 'Stock management, inventory tracking, availability, and warehouse operations',
            'keywords': ['stock', 'inventory', 'availability', 'warehouse', 'level', 'branch', 'tracking', 'out-of-stock'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        },
        'Shopping & Ordering': {
            'description': 'Shopping cart, checkout process, order management, and purchasing workflows',
            'keywords': ['cart', 'checkout', 'order', 'purchase', 'buy', 'shopping', 'basket', 'collect', 'behalf'],
            'priority': 'high',
            'item_types': ['epic', 'story']
        },
        'Shipping & Delivery': {
            'description': 'Shipping options, delivery management, address handling, and logistics',
            'keywords': ['shipping', 'delivery', 'address', 'logistics', 'transport', 'fulfillment'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        },
        'Customer Service & Support': {
            'description': 'Customer support tools, help features, returns, and service management',
            'keywords': ['support', 'service', 'help', 'return', 'refund', 'rma', 'chat', 'contact', 'assistance'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        },
        'Marketing & Promotion': {
            'description': 'Marketing tools, promotional features, analytics, and customer engagement',
            'keywords': ['marketing', 'promotion', 'analytics', 'engagement', 'social', 'newsletter', 'blog', 'seo'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        },
        'Integration & External': {
            'description': 'Third-party integrations, API connections, ERP systems, and external services',
            'keywords': ['integration', 'api', 'external', 'third-party', 'netsuite', 'erp', 'crm', 'sync'],
            'priority': 'critical',
            'item_types': ['epic', 'story']
        },
        'UI/UX & Frontend': {
            'description': 'User interface, user experience, frontend features, and visual components',
            'keywords': ['ui', 'ux', 'interface', 'frontend', 'component', 'layout', 'design', 'display', 'page'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        },
        'Forms & Communication': {
            'description': 'Forms, communication features, messaging, and user interaction',
            'keywords': ['form', 'communication', 'message', 'interaction', 'feedback', 'enquiry', 'contact'],
            'priority': 'low',
            'item_types': ['epic', 'story']
        },
        'System & Technical': {
            'description': 'Technical requirements, system configuration, performance, and infrastructure',
            'keywords': ['system', 'technical', 'config', 'performance', 'infrastructure', 'setup', 'module'],
            'priority': 'medium',
            'item_types': ['epic', 'story']
        }
    }

def categorize_work_item(item_data: Dict[str, Any], categories: Dict[str, Any]) -> Optional[str]:
    """Categorize a work item based on its content"""
    title = item_data.get('title', '').lower()
    description = item_data.get('description', '').lower()
    item_text = f"{title} {description}"
    
    best_category = None
    best_score = 0
    
    for category_name, config in categories.items():
        score = 0
        
        # Check if this category supports this item type
        item_type = item_data.get('type', 'story')
        if item_type not in config['item_types']:
            continue
        
        # Keyword matching with weights
        for keyword in config['keywords']:
            if keyword in item_text:
                # Higher weight for title matches
                if keyword in title:
                    score += 3
                else:
                    score += 1
                
                # Bonus for multiple occurrences
                count = item_text.count(keyword)
                if count > 1:
                    score += count - 1
        
        # Priority boost
        if config['priority'] in ['critical', 'high'] and score > 0:
            score += 1
        
        if score > best_score:
            best_score = score
            best_category = category_name
    
    return best_category if best_score > 0 else None

def create_epic_for_category(category_name: str, category_config: Dict[str, Any], project_id: UUID) -> Dict[str, Any]:
    """Create an epic for a category"""
    import uuid
    from datetime import datetime
    
    return {
        'title': category_name,
        'description': category_config['description'],
        'type': 'epic',
        'priority': category_config['priority'],
        'acceptance_criteria': [
            "All child stories completed successfully",
            "Integration testing passed", 
            "User acceptance criteria met"
        ],
        'estimated_hours': None,
        'order_index': 0,  # Will be set later
        'parent_reference': None,
        '_generated_epic': True,  # Mark as auto-generated
        '_category': category_name,
        '_project_id': str(project_id)
    }

def assign_task_to_story(task_data: Dict[str, Any], stories: List[Dict[str, Any]]) -> Optional[str]:
    """Find the best story for a task based on content similarity"""
    task_text = f"{task_data.get('title', '')} {task_data.get('description', '')}".lower()
    task_words = set(word for word in task_text.split() if len(word) > 3)
    
    best_story = None
    best_score = 0
    
    for story in stories:
        story_text = f"{story.get('title', '')} {story.get('description', '')}".lower()
        story_words = set(word for word in story_text.split() if len(word) > 3)
        
        # Calculate word overlap score
        common_words = task_words & story_words
        score = len(common_words)
        
        # Bonus for exact phrase matches
        for task_word in task_words:
            if task_word in story_text:
                score += 0.5
        
        if score > best_score:
            best_score = score
            best_story = story
    
    return story.get('title') if best_story and best_score > 0 else None

def organize_work_items_intelligently(work_items_data: List[Dict[str, Any]], project_id: UUID) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Intelligently organize work items into proper hierarchy
    Returns: (organized_items, organization_stats)
    """
    categories = create_smart_categories()
    
    # Separate items by type
    epics = [item for item in work_items_data if item.get('type') == 'epic']
    stories = [item for item in work_items_data if item.get('type') == 'story']
    tasks = [item for item in work_items_data if item.get('type') == 'task']
    subtasks = [item for item in work_items_data if item.get('type') == 'subtask']
    
    organized_items = []
    category_epic_map = {}  # category_name -> epic_title
    stats = {
        'original_counts': {
            'epics': len(epics),
            'stories': len(stories), 
            'tasks': len(tasks),
            'subtasks': len(subtasks)
        },
        'created_epics': 0,
        'assigned_relationships': 0,
        'orphaned_items': 0
    }
    
    # Step 1: Process existing epics
    for epic in epics:
        category = categorize_work_item(epic, categories)
        if category:
            category_epic_map[category] = epic['title']
            epic['_category'] = category
        organized_items.append(epic)
    
    # Step 2: Create epics for orphaned stories
    orphaned_stories = []
    for story in stories:
        if not story.get('parent_reference'):
            category = categorize_work_item(story, categories)
            if category and category not in category_epic_map:
                # Create epic for this category
                new_epic = create_epic_for_category(category, categories[category], project_id)
                organized_items.append(new_epic)
                category_epic_map[category] = new_epic['title']
                stats['created_epics'] += 1
            
            if category and category in category_epic_map:
                story['parent_reference'] = category_epic_map[category]
                stats['assigned_relationships'] += 1
            else:
                orphaned_stories.append(story)
        
        organized_items.append(story)
    
    # Step 3: Assign orphaned stories to general epic
    if orphaned_stories:
        general_category = 'System & Technical'  # Most flexible category
        if general_category not in category_epic_map:
            new_epic = create_epic_for_category(general_category, categories[general_category], project_id)
            organized_items.append(new_epic)
            category_epic_map[general_category] = new_epic['title']
            stats['created_epics'] += 1
        
        for story in orphaned_stories:
            story['parent_reference'] = category_epic_map[general_category]
            stats['assigned_relationships'] += 1
    
    # Step 4: Assign tasks to stories
    for task in tasks:
        if not task.get('parent_reference'):
            # Find best matching story
            best_story_title = assign_task_to_story(task, stories)
            if best_story_title:
                task['parent_reference'] = best_story_title
                stats['assigned_relationships'] += 1
            else:
                # Assign to first available story
                if stories:
                    task['parent_reference'] = stories[0]['title']
                    stats['assigned_relationships'] += 1
                else:
                    stats['orphaned_items'] += 1
        
        organized_items.append(task)
    
    # Step 5: Assign subtasks to tasks (or stories if no tasks)
    for subtask in subtasks:
        if not subtask.get('parent_reference'):
            # Prefer tasks, then stories
            potential_parents = tasks if tasks else stories
            if potential_parents:
                best_parent_title = assign_task_to_story(subtask, potential_parents)
                if best_parent_title:
                    subtask['parent_reference'] = best_parent_title
                    stats['assigned_relationships'] += 1
                else:
                    subtask['parent_reference'] = potential_parents[0]['title']
                    stats['assigned_relationships'] += 1
            else:
                stats['orphaned_items'] += 1
        
        organized_items.append(subtask)
    
    # Step 6: Set order indices
    priority_order = {'critical': 1, 'high': 2, 'medium': 3, 'low': 4}
    
    # Sort epics by priority
    epics_in_organized = [item for item in organized_items if item.get('type') == 'epic']
    epics_in_organized.sort(key=lambda x: (priority_order.get(x.get('priority', 'medium'), 5), x.get('title', '')))
    
    for i, epic in enumerate(epics_in_organized):
        epic['order_index'] = i + 1
    
    # Sort other items within their parent groups
    parent_children_map = defaultdict(list)
    for item in organized_items:
        if item.get('type') != 'epic':
            parent_ref = item.get('parent_reference')
            if parent_ref:
                parent_children_map[parent_ref].append(item)
    
    for parent_title, children in parent_children_map.items():
        children.sort(key=lambda x: (priority_order.get(x.get('priority', 'medium'), 5), x.get('title', '')))
        for i, child in enumerate(children):
            child['order_index'] = i + 1
    
    # Set order_index to 1 for items without parents (except epics)
    for item in organized_items:
        if item.get('type') != 'epic' and 'order_index' not in item:
            item['order_index'] = 1
    
    stats['final_counts'] = {
        'epics': len([item for item in organized_items if item.get('type') == 'epic']),
        'stories': len([item for item in organized_items if item.get('type') == 'story']),
        'tasks': len([item for item in organized_items if item.get('type') == 'task']),
        'subtasks': len([item for item in organized_items if item.get('type') == 'subtask'])
    }
    
    return organized_items, stats