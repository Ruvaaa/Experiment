export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Dataset {
  id: string
  user_id: string
  name: string
  description: string | null
  task_type: string | null
  num_samples: number | null
  num_classes: number | null
  source: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Model {
  id: string
  user_id: string
  name: string
  model_type: string | null
  framework: string | null
  description: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Experiment {
  id: string
  user_id: string
  name: string
  description: string | null
  model_id: string | null
  dataset_id: string | null
  status: 'active' | 'archived' | 'completed'
  is_favorite: boolean
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
  model?: Model
  dataset?: Dataset
  runs?: ExperimentRun[]
}

export interface ExperimentRun {
  id: string
  experiment_id: string
  user_id: string
  run_number: number
  accuracy: number | null
  precision_score: number | null
  recall: number | null
  f1_score: number | null
  loss: number | null
  epochs: number | null
  learning_rate: number | null
  batch_size: number | null
  training_time_seconds: number | null
  notes: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface UserMilestone {
  id: string
  user_id: string
  milestone_type: string
  achieved_at: string
}

export type ExperimentStatus = 'active' | 'archived' | 'completed'

export interface ExperimentFilters {
  search: string
  model_id: string | null
  dataset_id: string | null
  tags: string[]
  favorites_only: boolean
  show_archived: boolean
  sort: 'newest' | 'oldest' | 'best_accuracy' | 'name'
}
